import { storage } from "./storage";
import { sendPushNotification } from "./firebase-push";
import { db } from "./db";
import { scheduledPushes } from "@shared/schema";
import type { InsertNotification } from "@shared/schema";
import { sql, and, lte, isNull } from "drizzle-orm";
import { addHours, addMinutes, isAfter, format } from "date-fns";

function parseTimeOffset(offset: string): number {
  const match = offset.match(/^(\d+)(m|h|d)$/);
  if (!match) return 0;
  const value = parseInt(match[1]);
  switch (match[2]) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

// Format a date in a specific IANA timezone, e.g. "Apr 25 at 1:12 PM"
function formatInTz(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    }).formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
    return `${get("month")} ${get("day")} at ${get("hour")}:${get("minute")} ${get("dayPeriod")}`;
  } catch {
    return format(date, "MMM d 'at' h:mm a");
  }
}

// Returns true if the given UTC date falls within quiet hours in the given IANA timezone
function isInQuietHours(date: Date, timezone: string, quietStart: string, quietEnd: string): boolean {
  try {
    const fmt = (part: Intl.DateTimeFormatPartTypes) =>
      new Intl.DateTimeFormat("en-US", { timeZone: timezone, [part]: "2-digit", hour12: false } as any)
        .formatToParts(date).find(p => p.type === part)?.value ?? "00";
    const localH = parseInt(fmt("hour"));
    const localM = parseInt(fmt("minute"));
    const localMins = localH * 60 + localM;
    const [sh, sm] = quietStart.split(":").map(Number);
    const [eh, em] = quietEnd.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    // Spans midnight (e.g. 21:00–08:00)
    if (startMins > endMins) return localMins >= startMins || localMins < endMins;
    return localMins >= startMins && localMins < endMins;
  } catch {
    return false;
  }
}

export interface TaskNotificationConfig {
  taskId: number;
  teenId: number;
  taskTitle: string;
  dueDate: Date;
  points: number;
}

export interface ParentTaskNotificationConfig {
  taskId: number;
  userId: number;
  taskTitle: string;
  dueDate: Date;
}

export class NotificationService {

  // ─── DB-backed scheduling (replaces in-memory setTimeout) ───────────────────

  private async scheduleDbPush(
    key: string,
    scheduledFor: Date,
    type: string,
    title: string,
    body: string,
    recipientUserId?: number,
    recipientTeenId?: number,
    relatedTaskId?: number,
    relatedEventId?: number,
  ) {
    try {
      await db.execute(sql`
        INSERT INTO scheduled_pushes
          (key, type, title, body, recipient_user_id, recipient_teen_id, related_task_id, related_event_id, scheduled_for)
        VALUES
          (${key}, ${type}, ${title}, ${body},
           ${recipientUserId ?? null}, ${recipientTeenId ?? null},
           ${relatedTaskId ?? null}, ${relatedEventId ?? null},
           ${scheduledFor})
        ON CONFLICT (key) DO NOTHING
      `);
    } catch (err) {
      console.error(`[NotifScheduler] Failed to schedule ${key}:`, err);
    }
  }

  private async cancelDbPushes(filter: string) {
    // filter is either "task_<id>" or "event_<id>" — matches any key containing it
    await db.execute(sql`
      UPDATE scheduled_pushes
      SET cancelled_at = NOW()
      WHERE key LIKE ${'%' + filter + '%'}
        AND fired_at IS NULL
        AND cancelled_at IS NULL
    `);
  }

  // ─── Poller — runs every 60s on startup, safe for multi-instance autoscale ──

  public startPoller() {
    const tick = () => this.processDuePushes();
    tick(); // fire immediately on startup
    setInterval(tick, 60 * 1000);
    console.log("[NotifPoller] Started — polling every 60s");
  }

  private async processDuePushes() {
    try {
      // Atomic claim: UPDATE...RETURNING with FOR UPDATE SKIP LOCKED
      // Only one autoscale instance will process each row — no double-sends
      const result = await db.execute(sql`
        UPDATE scheduled_pushes
        SET fired_at = NOW()
        WHERE id IN (
          SELECT id FROM scheduled_pushes
          WHERE scheduled_for <= NOW()
            AND fired_at IS NULL
            AND cancelled_at IS NULL
          ORDER BY scheduled_for
          LIMIT 50
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, key, type, title, body,
                  recipient_user_id, recipient_teen_id,
                  related_task_id, related_event_id
      `);

      if (result.rows.length > 0) {
        console.log(`[NotifPoller] Firing ${result.rows.length} due notification(s)`);
      }

      for (const row of result.rows as any[]) {
        await this.firePush(row).catch(err =>
          console.error(`[NotifPoller] Failed to fire push ${row.key}:`, err)
        );
      }
    } catch (err) {
      console.error("[NotifPoller] Poll error:", err);
    }
  }

  private async firePush(row: any) {
    const { title, body, recipient_user_id, recipient_teen_id, related_task_id, related_event_id, type } = row;
    const isUrgent = type === "task_past_due";

    // Skip repeat overdue notifications if the task is already completed
    if (related_task_id && type === "task_past_due") {
      const task = await storage.getTaskById(related_task_id).catch(() => null);
      if (task?.status === "completed") {
        console.log(`[NotifPoller] Skipping overdue push — task ${related_task_id} already completed`);
        return;
      }
    }

    if (recipient_user_id) {
      const familyMember = await storage.getFamilyMemberByUserId(recipient_user_id);
      if (familyMember) {
        const notifRecord: InsertNotification = {
          type,
          title,
          message: body,
          recipientId: familyMember.id,
          relatedTaskId: related_task_id ?? undefined,
          deliveryMethod: "in_app",
          scheduledFor: new Date(),
          status: isUrgent ? "urgent" : "pending",
        };
        await storage.createNotification(notifRecord).catch(err =>
          console.error("[NotifPoller] In-app notification save failed (push still sending):", err)
        );
      }

      await sendPushNotification({
        userId: recipient_user_id,
        title,
        body,
        data: {
          type,
          ...(related_task_id ? { taskId: String(related_task_id) } : {}),
          ...(related_event_id ? { eventId: String(related_event_id) } : {}),
        },
      }).catch(err => console.error("[NotifPoller] Push send failed:", err));
    }

    if (recipient_teen_id) {
      const teenProfile = await storage.getTeenProfile(recipient_teen_id);
      if (teenProfile) {
        const notifRecord: InsertNotification = {
          type,
          title,
          message: body,
          recipientId: recipient_teen_id,
          relatedTaskId: related_task_id ?? undefined,
          deliveryMethod: "in_app",
          scheduledFor: new Date(),
          status: isUrgent ? "urgent" : "pending",
        };
        await storage.createNotification(notifRecord).catch(err =>
          console.error("[NotifPoller] Teen in-app notification save failed (push still sending):", err)
        );

        if (teenProfile.userId) {
          await sendPushNotification({
            userId: teenProfile.userId,
            title,
            body,
            data: { type, ...(related_task_id ? { taskId: String(related_task_id) } : {}) },
          }).catch(err => console.error("[NotifPoller] Teen push send failed:", err));
        }
      }
    }
  }

  // ─── Backfill on startup — reschedules existing tasks/events ────────────────

  public async backfillExistingSchedule() {
    const now = new Date();
    let tasksScheduled = 0;
    let eventsScheduled = 0;

    try {
      // Backfill incomplete tasks with future due dates
      const taskRows = await db.execute(sql`
        SELECT t.id, t.title, t.due_date, t.teen_id,
               fm.user_id AS assignee_user_id
        FROM tasks t
        LEFT JOIN family_members fm ON fm.id = t.assigned_to
        WHERE t.is_completed = false
          AND t.due_date IS NOT NULL
          AND t.due_date > ${now}
      `);

      for (const task of taskRows.rows as any[]) {
        const dueDate = new Date(task.due_date);

        // 2 hours before reminder
        const reminderTime = addHours(dueDate, -2);
        if (isAfter(reminderTime, now)) {
          if (task.assignee_user_id) {
            await this.scheduleDbPush(
              `parent_reminder_${task.id}_${task.assignee_user_id}`,
              reminderTime, "task_reminder",
              "Task Reminder",
              `⏰ Reminder: "${task.title}" is due in 2 hours`,
              task.assignee_user_id, undefined, task.id
            );
          }
          if (task.teen_id) {
            await this.scheduleDbPush(
              `reminder_${task.id}`,
              reminderTime, "task_reminder",
              "Task Reminder",
              `⏰ Reminder: "${task.title}" is due in 2 hours`,
              undefined, task.teen_id, task.id
            );
          }
        }

        // Overdue (15 min after due)
        const overdueTime = addMinutes(dueDate, 15);
        if (isAfter(overdueTime, now)) {
          if (task.assignee_user_id) {
            await this.scheduleDbPush(
              `parent_past_due_${task.id}_${task.assignee_user_id}`,
              overdueTime, "task_past_due",
              "Task Overdue",
              `🚨 Task overdue: "${task.title}" — please complete soon!`,
              task.assignee_user_id, undefined, task.id
            );
          }
          if (task.teen_id) {
            await this.scheduleDbPush(
              `past_due_${task.id}`,
              overdueTime, "task_past_due",
              "Task Overdue",
              `⏰ "${task.title}" is past due. Get it done!`,
              undefined, task.teen_id, task.id
            );
          }
        }

        tasksScheduled++;
      }

      // Backfill future events
      const eventRows = await db.execute(sql`
        SELECT e.id, e.title, e.start_time,
               fm.user_id AS creator_user_id
        FROM events e
        JOIN family_members fm ON fm.id = e.created_by
        WHERE e.start_time > ${now}
      `);

      for (const event of eventRows.rows as any[]) {
        const startTime = new Date(event.start_time);
        const userId = event.creator_user_id;
        if (!userId) continue;

        const r1 = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
        if (isAfter(r1, now)) {
          await this.scheduleDbPush(`event_r1_${event.id}`, r1, "event_reminder", "Event Reminder",
            `📅 Tomorrow: "${event.title}" at ${format(startTime, "h:mm a")}`,
            userId, undefined, undefined, event.id);
        }
        const r2 = new Date(startTime.getTime() - 60 * 60 * 1000);
        if (isAfter(r2, now)) {
          await this.scheduleDbPush(`event_r2_${event.id}`, r2, "event_reminder", "Event Reminder",
            `⏰ Starting in 1 hour: "${event.title}"`,
            userId, undefined, undefined, event.id);
        }
        const r3 = new Date(startTime.getTime() - 15 * 60 * 1000);
        if (isAfter(r3, now)) {
          await this.scheduleDbPush(`event_r3_${event.id}`, r3, "event_reminder", "Event Reminder",
            `🔔 Starting in 15 minutes: "${event.title}"`,
            userId, undefined, undefined, event.id);
        }
        eventsScheduled++;
      }

      console.log(`[NotifPoller] Backfill complete — ${tasksScheduled} tasks, ${eventsScheduled} events seeded`);
    } catch (err) {
      console.error("[NotifPoller] Backfill error:", err);
    }
  }

  // ─── Public scheduling API (called when tasks/events are created) ────────────

  async scheduleTaskNotifications(config: TaskNotificationConfig) {
    const { taskId, teenId, taskTitle, dueDate, points } = config;

    const teenProfile = await storage.getTeenProfile(teenId);
    if (!teenProfile) return;
    const notifSettings = await storage.getTeenNotificationSettings(teenProfile.id);
    if (notifSettings?.taskReminders === false) return;

    const now = new Date();

    // Resolve teen's timezone up front (used for display formatting + quiet hours)
    const teenUserPrefs = await storage.getUserPreferences(teenProfile.userId);
    const tz = teenUserPrefs?.timezone || "America/New_York";

    // Immediate assignment notification
    await this.sendImmediatePush({
      type: "task_assigned", title: "New Task Assigned",
      body: `📋 New task: "${taskTitle}" — Due ${formatInTz(dueDate, tz)} (${points} points)`,
      recipientTeenId: teenId, relatedTaskId: taskId,
    });

    // 2 hours before reminder
    const reminderTime = addHours(dueDate, -2);
    if (isAfter(reminderTime, now)) {
      await this.scheduleDbPush(
        `reminder_${taskId}`, reminderTime, "task_reminder",
        "Task Reminder", `⏰ Reminder: "${taskTitle}" is due in 2 hours (${points} points)`,
        undefined, teenId, taskId
      );
    }

    // Overdue (15 min after due)
    const overdueTime = addMinutes(dueDate, 15);
    if (isAfter(overdueTime, now)) {
      await this.scheduleDbPush(
        `past_due_${taskId}`, overdueTime, "task_past_due",
        "Task Overdue", `⏰ "${taskTitle}" is past due. Get it done!`,
        undefined, teenId, taskId
      );
    }

    // Progressive repeat reminders every 4 hours after overdue, skipping quiet hours
    const quietStart = notifSettings?.quietStart || "21:00";
    const quietEnd = notifSettings?.quietEnd || "08:00";
    const MAX_REPEATS = 6; // up to 24 hours of follow-ups

    let repeatCount = 0;
    for (let i = 1; i <= MAX_REPEATS * 2 && repeatCount < MAX_REPEATS; i++) {
      const candidate = addHours(overdueTime, 4 * i);
      if (!isAfter(candidate, now)) continue;
      if (isInQuietHours(candidate, tz, quietStart, quietEnd)) continue;
      await this.scheduleDbPush(
        `overdue_repeat_${taskId}_${i}`, candidate, "task_past_due",
        "Task Still Overdue", `⏰ Still waiting: "${taskTitle}" needs to be done! (${points} pts)`,
        undefined, teenId, taskId
      );
      repeatCount++;
    }
  }

  async scheduleParentTaskNotifications(config: ParentTaskNotificationConfig) {
    const { taskId, userId, taskTitle, dueDate } = config;

    const prefs = await storage.getUserPreferences(userId);
    if (prefs?.taskReminders === false) return;

    const now = new Date();
    const reminderOnAssign = prefs?.taskReminderOnAssign ?? true;
    const beforeDue = prefs?.taskReminderBeforeDue || "2h";
    const overdueEnabled = prefs?.taskOverdueReminder ?? true;

    // Immediate on-assign notification
    const parentTz = prefs?.timezone || "America/New_York";
    if (reminderOnAssign) {
      await this.sendImmediatePush({
        type: "task_assigned", title: "Task Notification",
        body: `📋 New task: "${taskTitle}" — Due ${formatInTz(dueDate, parentTz)}`,
        recipientUserId: userId, relatedTaskId: taskId,
      });
    }

    // Before-due reminder
    const beforeDueMs = parseTimeOffset(beforeDue);
    if (beforeDueMs > 0) {
      const reminderTime = new Date(dueDate.getTime() - beforeDueMs);
      if (isAfter(reminderTime, now)) {
        const labelMap: Record<string, string> = { "30m": "30 minutes", "1h": "1 hour", "2h": "2 hours", "4h": "4 hours" };
        const label = labelMap[beforeDue] || beforeDue;
        await this.scheduleDbPush(
          `parent_reminder_${taskId}_${userId}`, reminderTime, "task_reminder",
          "Task Reminder", `⏰ Reminder: "${taskTitle}" is due in ${label}`,
          userId, undefined, taskId
        );
      }
    }

    // Overdue (15 min after due)
    if (overdueEnabled) {
      const overdueTime = addMinutes(dueDate, 15);
      if (isAfter(overdueTime, now)) {
        await this.scheduleDbPush(
          `parent_past_due_${taskId}_${userId}`, overdueTime, "task_past_due",
          "Task Overdue", `🚨 Task overdue: "${taskTitle}" — please complete soon!`,
          userId, undefined, taskId
        );
      }
    }
  }

  async scheduleEventReminders(config: {
    eventId: number;
    userId: number;
    eventTitle: string;
    startTime: Date;
    location?: string;
  }) {
    const { eventId, userId, eventTitle, startTime, location } = config;

    const prefs = await storage.getUserPreferences(userId);
    if (prefs?.eventReminders === false) return;

    const now = new Date();
    const locationText = location ? ` at ${location}` : "";
    const r1 = prefs?.eventReminder1 || "1d";
    const r2 = prefs?.eventReminder2 || "1h";
    const r3 = prefs?.eventReminder3 || "15m";
    const labelMap: Record<string, string> = {
      "5m": "5 minutes", "15m": "15 minutes", "30m": "30 minutes",
      "1h": "1 hour", "2h": "2 hours", "12h": "12 hours", "1d": "tomorrow"
    };

    if (r1 !== "none") {
      const t1 = new Date(startTime.getTime() - parseTimeOffset(r1));
      if (isAfter(t1, now)) {
        await this.scheduleDbPush(`event_r1_${eventId}`, t1, "event_reminder", "Event Reminder",
          r1 === "1d"
            ? `📅 Tomorrow: "${eventTitle}"${locationText} at ${format(startTime, "h:mm a")}`
            : `📅 In ${labelMap[r1] || r1}: "${eventTitle}"${locationText}`,
          userId, undefined, undefined, eventId);
      }
    }
    if (r2 !== "none") {
      const t2 = new Date(startTime.getTime() - parseTimeOffset(r2));
      if (isAfter(t2, now)) {
        await this.scheduleDbPush(`event_r2_${eventId}`, t2, "event_reminder", "Event Reminder",
          `⏰ Starting in ${labelMap[r2] || r2}: "${eventTitle}"${locationText}`,
          userId, undefined, undefined, eventId);
      }
    }
    if (r3 !== "none") {
      const t3 = new Date(startTime.getTime() - parseTimeOffset(r3));
      if (isAfter(t3, now)) {
        await this.scheduleDbPush(`event_r3_${eventId}`, t3, "event_reminder", "Event Reminder",
          `🔔 Starting in ${labelMap[r3] || r3}: "${eventTitle}"${locationText}`,
          userId, undefined, undefined, eventId);
      }
    }

    // At-start notification
    if (isAfter(startTime, now)) {
      await this.scheduleDbPush(`event_start_${eventId}`, startTime, "event_reminder",
        "Starting Now", `🗓️ Starting now: "${eventTitle}"${locationText}`,
        userId, undefined, undefined, eventId);
    }
  }

  async cancelTaskNotifications(taskId: number) {
    await this.cancelDbPushes(`_${taskId}`);
    await this.cancelDbPushes(`_${taskId}_`);
  }

  async markTaskCompleted(taskId: number) {
    await this.cancelTaskNotifications(taskId);
  }

  async cancelEventReminders(eventId: number) {
    await this.cancelDbPushes(`event_r1_${eventId}`);
    await this.cancelDbPushes(`event_r2_${eventId}`);
    await this.cancelDbPushes(`event_r3_${eventId}`);
    await this.cancelDbPushes(`event_start_${eventId}`);
  }

  // ─── Immediate send helper (no scheduling — fires right now) ────────────────

  private async sendImmediatePush(opts: {
    type: string; title: string; body: string;
    recipientUserId?: number; recipientTeenId?: number;
    relatedTaskId?: number;
  }) {
    const { type, title, body, recipientUserId, recipientTeenId, relatedTaskId } = opts;

    if (recipientUserId) {
      const familyMember = await storage.getFamilyMemberByUserId(recipientUserId);
      if (familyMember) {
        const notifRecord: InsertNotification = {
          type, title, message: body, recipientId: familyMember.id,
          relatedTaskId, deliveryMethod: "in_app", scheduledFor: new Date(), status: "pending",
        };
        await storage.createNotification(notifRecord).catch(err =>
          console.error("[NotifService] In-app notification save failed (push still sending):", err)
        );
      }
      await sendPushNotification({ userId: recipientUserId, title, body, data: { type } })
        .catch(err => console.error("[NotifService] Immediate push failed:", err));
    }

    if (recipientTeenId) {
      const teenProfile = await storage.getTeenProfile(recipientTeenId);
      if (teenProfile) {
        const notifRecord: InsertNotification = {
          type, title, message: body, recipientId: recipientTeenId,
          relatedTaskId, deliveryMethod: "in_app", scheduledFor: new Date(), status: "pending",
        };
        await storage.createNotification(notifRecord).catch(err =>
          console.error("[NotifService] Teen in-app notification save failed (push still sending):", err)
        );
        if (teenProfile.userId) {
          await sendPushNotification({ userId: teenProfile.userId, title, body, data: { type } })
            .catch(err => console.error("[NotifService] Teen immediate push failed:", err));
        }
      }
    }
  }

  // ─── Daily digest ────────────────────────────────────────────────────────────

  async sendDailyDigest(userId: number) {
    const prefs = await storage.getUserPreferences(userId);
    if (prefs?.dailyDigest === false) return;

    const user = await storage.getUser(userId);
    if (!user) return;

    const familyMembership = await storage.getUserFamilyMembership(userId);
    if (!familyMembership) return;

    const tasks = await storage.getTasksByFamily(familyMembership.familyId);
    const openTasks = tasks.filter(t => !t.isCompleted);
    if (openTasks.length === 0) return;

    const today = new Date();
    const overdue = openTasks.filter(t => t.dueDate && new Date(t.dueDate) < today);
    const dueToday = openTasks.filter(t => t.dueDate && new Date(t.dueDate!).toDateString() === today.toDateString());

    let message = `📋 Daily Task Summary:\n`;
    if (overdue.length > 0) message += `🚨 ${overdue.length} overdue\n`;
    if (dueToday.length > 0) message += `⏰ ${dueToday.length} due today\n`;
    message += `Total open: ${openTasks.length}`;

    await this.sendImmediatePush({
      type: "digest", title: "Daily Task Summary", body: message, recipientUserId: userId,
    });
  }

  async scheduleDailyDigests() {
    console.log("📅 Daily digest scheduler ready");
  }
}

export const notificationService = new NotificationService();
