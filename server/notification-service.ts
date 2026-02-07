import { storage } from "./storage";
import { sendEmail } from "./email-service";
import { sendPushNotification, sendPushToFamilyMember } from "./firebase-push";
import type { InsertNotification } from "@shared/schema";
import { addHours, addMinutes, isBefore, isAfter, format } from "date-fns";

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
  private notificationQueue: Map<string, NodeJS.Timeout> = new Map();
  
  async scheduleTaskNotifications(config: TaskNotificationConfig) {
    const { taskId, teenId, taskTitle, dueDate, points } = config;
    
    // Get teen's notification preferences
    const teenProfile = await storage.getTeenProfile(teenId);
    const notificationSettings = await storage.getTeenNotificationSettings(teenProfile?.id || 0);
    
    if (!notificationSettings?.taskReminders) {
      return; // Teen has disabled task notifications
    }
    
    const now = new Date();
    
    // 1. Initial notification - immediate
    await this.sendTaskNotification({
      type: "task_assigned",
      taskId,
      teenId,
      taskTitle,
      dueDate,
      points,
      message: `📋 New task assigned: "${taskTitle}" - Due ${format(dueDate, "MMM d 'at' h:mm a")} (${points} points)`
    });
    
    // 2. Reminder 2 hours before due date
    const reminderTime = addHours(dueDate, -2);
    if (isAfter(reminderTime, now)) {
      this.scheduleNotification(`reminder_${taskId}`, reminderTime, async () => {
        await this.sendTaskNotification({
          type: "task_reminder",
          taskId,
          teenId,
          taskTitle,
          dueDate,
          points,
          message: `⏰ Reminder: "${taskTitle}" is due in 2 hours (${points} points)`
        });
      });
    }
    
    // 3. Past due notification
    const pastDueTime = addMinutes(dueDate, 15); // 15 minutes after due
    
    // Check if task is already overdue (dueDate is in the past)
    if (isBefore(dueDate, now)) {
      // Task is already overdue at creation - send immediate notification
      await this.sendTaskNotification({
        type: "task_past_due",
        taskId,
        teenId,
        taskTitle,
        dueDate,
        points,
        message: `🚨 Task overdue: "${taskTitle}" - Complete soon to earn ${points} points!`
      });
      // Start recurring reminders immediately
      this.scheduleRecurringReminders(taskId, teenId, taskTitle, points);
    } else {
      // Schedule past-due notification for 15 minutes after due date
      this.scheduleNotification(`past_due_${taskId}`, pastDueTime, async () => {
        await this.sendTaskNotification({
          type: "task_past_due",
          taskId,
          teenId,
          taskTitle,
          dueDate,
          points,
          message: `🚨 Task overdue: "${taskTitle}" - Complete soon to earn ${points} points!`
        });
        
        // Start recurring reminders every 4 hours
        this.scheduleRecurringReminders(taskId, teenId, taskTitle, points);
      });
    }
  }
  
  // Parent/User task notifications
  async scheduleParentTaskNotifications(config: ParentTaskNotificationConfig) {
    const { taskId, userId, taskTitle, dueDate } = config;
    
    const prefs = await storage.getUserPreferences(userId);
    
    if (prefs?.taskReminders === false) {
      return;
    }
    
    const now = new Date();
    const reminderOnAssign = prefs?.taskReminderOnAssign ?? true;
    const beforeDue = prefs?.taskReminderBeforeDue || "2h";
    const overdueEnabled = prefs?.taskOverdueReminder ?? true;
    const overdueInterval = prefs?.taskOverdueRepeatInterval || "4h";
    
    // 1. Initial notification - immediate (if enabled)
    if (reminderOnAssign) {
      await this.sendParentTaskNotification({
        type: "task_assigned",
        taskId,
        userId,
        taskTitle,
        dueDate,
        message: `📋 New task: "${taskTitle}" - Due ${format(dueDate, "MMM d 'at' h:mm a")}`
      });
    }
    
    // 2. Reminder before due date (customizable)
    const beforeDueMs = parseTimeOffset(beforeDue);
    if (beforeDueMs > 0) {
      const reminderTime = new Date(dueDate.getTime() - beforeDueMs);
      if (isAfter(reminderTime, now)) {
        const label = beforeDue === "30m" ? "30 minutes" : beforeDue === "1h" ? "1 hour" : beforeDue === "2h" ? "2 hours" : "4 hours";
        this.scheduleNotification(`parent_reminder_${taskId}_${userId}`, reminderTime, async () => {
          await this.sendParentTaskNotification({
            type: "task_reminder",
            taskId,
            userId,
            taskTitle,
            dueDate,
            message: `⏰ Reminder: "${taskTitle}" is due in ${label}`
          });
        });
      }
    }
    
    // 3. Past due notification (if enabled)
    if (overdueEnabled) {
      const pastDueTime = addMinutes(dueDate, 15);
      
      if (isBefore(dueDate, now)) {
        await this.sendParentTaskNotification({
          type: "task_past_due",
          taskId,
          userId,
          taskTitle,
          dueDate,
          message: `🚨 Task overdue: "${taskTitle}" - Please complete soon!`
        });
        if (overdueInterval !== "none") {
          this.scheduleParentRecurringReminders(taskId, userId, taskTitle, overdueInterval);
        }
      } else {
        this.scheduleNotification(`parent_past_due_${taskId}_${userId}`, pastDueTime, async () => {
          await this.sendParentTaskNotification({
            type: "task_past_due",
            taskId,
            userId,
            taskTitle,
            dueDate,
            message: `🚨 Task overdue: "${taskTitle}" - Please complete soon!`
          });
          if (overdueInterval !== "none") {
            this.scheduleParentRecurringReminders(taskId, userId, taskTitle, overdueInterval);
          }
        });
      }
    }
  }
  
  private scheduleParentRecurringReminders(taskId: number, userId: number, taskTitle: string, interval: string = "4h") {
    const intervalMs = parseTimeOffset(interval);
    if (intervalMs <= 0) return;
    
    const intervalId = setInterval(async () => {
      const task = await storage.getTask(taskId);
      if (!task || task.isCompleted) {
        clearInterval(intervalId);
        return;
      }
      
      await this.sendParentTaskNotification({
        type: "task_recurring_reminder",
        taskId,
        userId,
        taskTitle,
        message: `🔔 Still pending: "${taskTitle}"`
      });
    }, intervalMs);
    
    this.notificationQueue.set(`parent_recurring_${taskId}_${userId}`, intervalId);
  }
  
  private async sendParentTaskNotification(notification: {
    type: string;
    taskId: number;
    userId: number;
    taskTitle: string;
    dueDate?: Date;
    message: string;
  }) {
    const { taskId, userId, message, type } = notification;
    
    // Get user preferences
    const prefs = await storage.getUserPreferences(userId);
    const notificationMethod = prefs?.notificationMethod || "in_app";
    
    // Create in-app notification
    const notificationRecord: InsertNotification = {
      title: "Task Notification",
      message,
      recipientId: userId,
      relatedTaskId: taskId,
      deliveryMethod: "in_app",
      scheduledFor: new Date(),
      status: type === "task_past_due" ? "urgent" : "pending"
    };
    await storage.createNotification(notificationRecord);
    console.log(`📱 Parent in-app notification: ${message}`);

    // Send FCM push notification
    try {
      await sendPushNotification({
        userId,
        title: "Task Notification",
        body: message,
        data: { type: "task", taskId: String(taskId) },
      });
    } catch (error) {
      console.error("Failed to send parent push notification:", error);
    }
  }

  private scheduleRecurringReminders(taskId: number, teenId: number, taskTitle: string, points: number) {
    const intervalId = setInterval(async () => {
      // Check if task is still pending
      const task = await storage.getTask(taskId);
      if (!task || task.isCompleted) {
        clearInterval(intervalId);
        return;
      }
      
      await this.sendTaskNotification({
        type: "task_recurring_reminder",
        taskId,
        teenId,
        taskTitle,
        points,
        message: `🔔 Still pending: "${taskTitle}" - ${points} points waiting for you!`
      });
    }, 4 * 60 * 60 * 1000); // 4 hours
    
    // Store the interval ID for cleanup
    this.notificationQueue.set(`recurring_${taskId}`, intervalId);
  }
  
  private scheduleNotification(key: string, scheduledTime: Date, callback: () => Promise<void>) {
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();
    
    if (delay > 0) {
      const timeoutId = setTimeout(async () => {
        await callback();
        this.notificationQueue.delete(key);
      }, delay);
      
      this.notificationQueue.set(key, timeoutId);
    }
  }
  
  private async sendTaskNotification(notification: {
    type: string;
    taskId: number;
    teenId: number;
    taskTitle: string;
    dueDate?: Date;
    points: number;
    message: string;
  }) {
    const { taskId, teenId, message, type } = notification;
    
    // For teen tasks, get teen profile and their notification settings
    const teenProfile = await storage.getTeenProfile(teenId);
    if (!teenProfile) {
      console.warn(`Teen profile ${teenId} not found`);
      return;
    }
    
    const teenSettings = await storage.getTeenNotificationSettings(teenProfile.id);
    
    // Determine notification method from teen settings
    // Default to "both" if not specified
    const preferSms = teenSettings?.preferSms !== false;
    const preferInApp = true; // Always send in-app for teens
    
    // Get phone number from teen profile
    const phoneNumber = teenProfile.phoneNumber;
    
    // Create in-app notification (always for teens)
    if (preferInApp) {
      const notificationRecord: InsertNotification = {
        title: "Task Notification",
        message,
        recipientId: teenId,
        relatedTaskId: taskId,
        deliveryMethod: "in_app",
        scheduledFor: new Date(),
        status: type === "task_past_due" ? "urgent" : "pending"
      };
      await storage.createNotification(notificationRecord);
      console.log(`📱 Teen in-app notification: ${message}`);
    }
    
    // Send FCM push notification to teen (if they have a linked user account)
    if (teenProfile.userId) {
      try {
        await sendPushNotification({
          userId: teenProfile.userId,
          title: "Task Notification",
          body: message,
          data: { type: "task", taskId: String(taskId) },
        });
      } catch (error) {
        console.error("Failed to send teen push notification:", error);
      }
    }
  }
  
  async cancelTaskNotifications(taskId: number) {
    // Cancel all scheduled notifications for this task
    const keys = Array.from(this.notificationQueue.keys()).filter(key => 
      key.includes(`_${taskId}`) || key.includes(`${taskId}_`)
    );
    
    keys.forEach(key => {
      const id = this.notificationQueue.get(key);
      if (id) {
        // Use clearInterval for recurring reminders, clearTimeout for others
        if (key.startsWith('recurring_')) {
          clearInterval(id);
        } else {
          clearTimeout(id);
        }
        this.notificationQueue.delete(key);
      }
    });
  }
  
  async markTaskCompleted(taskId: number) {
    await this.cancelTaskNotifications(taskId);
  }
  
  // Event reminder methods
  async scheduleEventReminders(config: {
    eventId: number;
    userId: number;
    eventTitle: string;
    startTime: Date;
    location?: string;
  }) {
    const { eventId, userId, eventTitle, startTime, location } = config;
    
    const prefs = await storage.getUserPreferences(userId);
    if (prefs?.eventReminders === false) {
      return;
    }
    
    const now = new Date();
    const locationText = location ? ` at ${location}` : "";
    
    const reminder1 = prefs?.eventReminder1 || "1d";
    const reminder2 = prefs?.eventReminder2 || "1h";
    const reminder3 = prefs?.eventReminder3 || "15m";

    const labelMap: Record<string, string> = {
      "5m": "5 minutes", "15m": "15 minutes", "30m": "30 minutes",
      "1h": "1 hour", "2h": "2 hours", "12h": "12 hours", "1d": "tomorrow"
    };
    
    // 1. First reminder (default: 1 day before)
    if (reminder1 !== "none") {
      const offset1 = parseTimeOffset(reminder1);
      const time1 = new Date(startTime.getTime() - offset1);
      if (isAfter(time1, now)) {
        const label = reminder1 === "1d" 
          ? `📅 Tomorrow: "${eventTitle}"${locationText} at ${format(startTime, "h:mm a")}`
          : `📅 In ${labelMap[reminder1] || reminder1}: "${eventTitle}"${locationText}`;
        this.scheduleNotification(`event_r1_${eventId}`, time1, async () => {
          await this.sendEventNotification({ eventId, userId, eventTitle, startTime, message: label });
        });
      }
    }
    
    // 2. Second reminder (default: 1 hour before)
    if (reminder2 !== "none") {
      const offset2 = parseTimeOffset(reminder2);
      const time2 = new Date(startTime.getTime() - offset2);
      if (isAfter(time2, now)) {
        this.scheduleNotification(`event_r2_${eventId}`, time2, async () => {
          await this.sendEventNotification({
            eventId, userId, eventTitle, startTime,
            message: `⏰ Starting in ${labelMap[reminder2] || reminder2}: "${eventTitle}"${locationText}`
          });
        });
      }
    }
    
    // 3. Third reminder (default: 15 minutes before)
    if (reminder3 !== "none") {
      const offset3 = parseTimeOffset(reminder3);
      const time3 = new Date(startTime.getTime() - offset3);
      if (isAfter(time3, now)) {
        this.scheduleNotification(`event_r3_${eventId}`, time3, async () => {
          await this.sendEventNotification({
            eventId, userId, eventTitle, startTime,
            message: `🔔 Starting in ${labelMap[reminder3] || reminder3}: "${eventTitle}"${locationText}`
          });
        });
      }
    }
  }
  
  private async sendEventNotification(notification: {
    eventId: number;
    userId: number;
    eventTitle: string;
    startTime: Date;
    message: string;
  }) {
    const { eventId, userId, message } = notification;
    
    // Get user preferences to determine delivery method
    const prefs = await storage.getUserPreferences(userId);
    const notificationMethod = prefs?.notificationMethod || "in_app";
    
    // Create in-app notification
    const notificationRecord: InsertNotification = {
      title: "Event Reminder",
      message,
      recipientId: userId,
      deliveryMethod: "in_app",
      scheduledFor: new Date(),
      status: "pending"
    };
    await storage.createNotification(notificationRecord);
    console.log(`📱 In-app event notification: ${message}`);

    // Send FCM push notification
    try {
      await sendPushNotification({
        userId,
        title: "Event Reminder",
        body: message,
        data: { type: "event", eventId: String(eventId) },
      });
    } catch (error) {
      console.error("Failed to send event push notification:", error);
    }
  }
  
  async cancelEventReminders(eventId: number) {
    const keys = Array.from(this.notificationQueue.keys()).filter(key => 
      key.startsWith(`event_`) && key.includes(`_${eventId}`)
    );
    
    keys.forEach(key => {
      const timeoutId = this.notificationQueue.get(key);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.notificationQueue.delete(key);
      }
    });
  }
  
  // Daily digest - sends summary of open tasks
  async sendDailyDigest(userId: number) {
    const prefs = await storage.getUserPreferences(userId);
    
    // Check if daily digest is enabled
    if (prefs?.dailyDigest === false) {
      return;
    }
    
    const notificationMethod = prefs?.notificationMethod || "both";
    
    // Get user info
    const user = await storage.getUser(userId);
    if (!user) return;
    
    // Get user's family membership
    const familyMembership = await storage.getUserFamilyMembership(userId);
    if (!familyMembership) return;
    
    // Get all open tasks for this user
    const tasks = await storage.getTasksByFamily(familyMembership.familyId);
    const openTasks = tasks.filter(t => !t.isCompleted);
    
    if (openTasks.length === 0) {
      return; // No open tasks, skip digest
    }
    
    // Categorize tasks
    const today = new Date();
    const tasksWithDueDate = openTasks.filter(t => t.dueDate);
    const tasksWithoutDueDate = openTasks.filter(t => !t.dueDate);
    const overdueTasks = tasksWithDueDate.filter(t => new Date(t.dueDate!) < today);
    const dueTodayTasks = tasksWithDueDate.filter(t => {
      const dueDate = new Date(t.dueDate!);
      return dueDate.toDateString() === today.toDateString();
    });
    
    // Build digest message
    let message = `📋 Daily Task Summary:\n`;
    
    if (overdueTasks.length > 0) {
      message += `🚨 ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}\n`;
    }
    if (dueTodayTasks.length > 0) {
      message += `⏰ ${dueTodayTasks.length} due today\n`;
    }
    if (tasksWithoutDueDate.length > 0) {
      message += `📌 ${tasksWithoutDueDate.length} task${tasksWithoutDueDate.length > 1 ? 's' : ''} with no deadline\n`;
    }
    
    message += `Total open: ${openTasks.length}`;
    
    // Create in-app notification
    const notificationRecord: InsertNotification = {
      title: "Daily Task Summary",
      message,
      recipientId: userId,
      deliveryMethod: "in_app",
      scheduledFor: new Date(),
      status: "pending"
    };
    await storage.createNotification(notificationRecord);
    console.log(`📱 Daily digest in-app notification sent to user ${userId}`);
    
    // Send FCM push notification for daily digest
    try {
      await sendPushNotification({
        userId,
        title: "Daily Task Summary",
        body: message,
        data: { type: "digest" },
      });
    } catch (error) {
      console.error("Failed to send daily digest push notification:", error);
    }
  }
  
  // Schedule daily digest for all users who have it enabled
  async scheduleDailyDigests() {
    // This would be called by a cron job or scheduler
    // For now, we'll just log that it's available
    console.log("📅 Daily digest scheduler is ready");
  }
}

export const notificationService = new NotificationService();