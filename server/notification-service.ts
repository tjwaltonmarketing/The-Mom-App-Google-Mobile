import { storage } from "./storage";
import { sendSMS } from "./sms-service";
import { sendEmail } from "./email-service";
import type { InsertNotification } from "@shared/schema";
import { addHours, addMinutes, isBefore, isAfter, format } from "date-fns";

export interface TaskNotificationConfig {
  taskId: number;
  teenId: number;
  taskTitle: string;
  dueDate: Date;
  points: number;
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
    
    // Get user preferences to determine delivery method
    const prefs = await storage.getUserPreferences(teenId);
    const notificationMethod = prefs?.notificationMethod || "both";
    
    // Get user info for SMS
    const user = await storage.getUser(teenId);
    const phoneNumber = user?.phoneNumber;
    
    // Create in-app notification if method includes in_app
    if (notificationMethod === "in_app" || notificationMethod === "both") {
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
      console.log(`📱 In-app notification: ${message}`);
    }
    
    // Send SMS if method includes sms and phone number is available
    if ((notificationMethod === "sms" || notificationMethod === "both") && phoneNumber) {
      try {
        const smsSent = await sendSMS(phoneNumber, message);
        if (smsSent) {
          console.log(`📲 SMS sent to ${phoneNumber}: ${message}`);
        }
      } catch (error) {
        console.error("Failed to send SMS:", error);
      }
    }
  }
  
  async cancelTaskNotifications(taskId: number) {
    // Cancel all scheduled notifications for this task
    const keys = Array.from(this.notificationQueue.keys()).filter(key => 
      key.includes(`_${taskId}`) || key.includes(`${taskId}_`)
    );
    
    keys.forEach(key => {
      const timeoutId = this.notificationQueue.get(key);
      if (timeoutId) {
        clearTimeout(timeoutId);
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
    
    // Get user's notification preferences
    const prefs = await storage.getUserPreferences(userId);
    if (prefs?.eventReminders === false) {
      return; // User has disabled event reminders
    }
    
    const now = new Date();
    const locationText = location ? ` at ${location}` : "";
    
    // 1. Reminder 1 day before (for events more than 1 day away)
    const oneDayBefore = addHours(startTime, -24);
    if (isAfter(oneDayBefore, now)) {
      this.scheduleNotification(`event_day_${eventId}`, oneDayBefore, async () => {
        await this.sendEventNotification({
          eventId,
          userId,
          eventTitle,
          startTime,
          message: `📅 Tomorrow: "${eventTitle}"${locationText} at ${format(startTime, "h:mm a")}`
        });
      });
    }
    
    // 2. Reminder 1 hour before
    const oneHourBefore = addHours(startTime, -1);
    if (isAfter(oneHourBefore, now)) {
      this.scheduleNotification(`event_hour_${eventId}`, oneHourBefore, async () => {
        await this.sendEventNotification({
          eventId,
          userId,
          eventTitle,
          startTime,
          message: `⏰ Starting in 1 hour: "${eventTitle}"${locationText}`
        });
      });
    }
    
    // 3. Reminder 15 minutes before
    const fifteenMinBefore = addMinutes(startTime, -15);
    if (isAfter(fifteenMinBefore, now)) {
      this.scheduleNotification(`event_soon_${eventId}`, fifteenMinBefore, async () => {
        await this.sendEventNotification({
          eventId,
          userId,
          eventTitle,
          startTime,
          message: `🔔 Starting in 15 minutes: "${eventTitle}"${locationText}`
        });
      });
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
    const notificationMethod = prefs?.notificationMethod || "both";
    
    // Get user info for SMS
    const user = await storage.getUser(userId);
    const phoneNumber = user?.phoneNumber;
    
    // Create in-app notification if method includes in_app
    if (notificationMethod === "in_app" || notificationMethod === "both") {
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
    }
    
    // Send SMS if method includes sms and phone number is available
    if ((notificationMethod === "sms" || notificationMethod === "both") && phoneNumber) {
      try {
        const smsSent = await sendSMS(phoneNumber, message);
        if (smsSent) {
          console.log(`📲 SMS event reminder sent to ${phoneNumber}: ${message}`);
        }
      } catch (error) {
        console.error("Failed to send event SMS:", error);
      }
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
    
    // Send via preferred method
    if (notificationMethod === "in_app" || notificationMethod === "both") {
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
    }
    
    if ((notificationMethod === "sms" || notificationMethod === "both") && user.phoneNumber) {
      try {
        const smsSent = await sendSMS(user.phoneNumber, message);
        if (smsSent) {
          console.log(`📲 Daily digest SMS sent to ${user.phoneNumber}`);
        }
      } catch (error) {
        console.error("Failed to send daily digest SMS:", error);
      }
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