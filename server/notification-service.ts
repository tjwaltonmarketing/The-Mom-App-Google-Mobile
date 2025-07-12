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
    
    if (!notificationSettings?.enabled) {
      return; // Teen has disabled notifications
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
    
    // Get teen's contact information
    const teenProfile = await storage.getTeenProfile(teenId);
    const notificationSettings = await storage.getTeenNotificationSettings(teenProfile?.id || 0);
    
    if (!notificationSettings?.enabled) return;
    
    // Create notification record
    const notificationRecord: InsertNotification = {
      title: "Task Notification",
      message,
      recipientId: teenId,
      relatedTaskId: taskId,
      deliveryMethod: notificationSettings.smsEnabled ? "sms" : "email",
      scheduledFor: new Date(),
      priority: type === "task_past_due" ? "high" : "medium"
    };
    
    await storage.createNotification(notificationRecord);
    
    // Send via preferred method
    try {
      if (notificationSettings.smsEnabled && teenProfile?.phoneNumber) {
        await sendSMS(teenProfile.phoneNumber, message);
      } else if (notificationSettings.emailEnabled && teenProfile?.email) {
        await sendEmail(teenProfile.email, "Task Notification", message);
      }
      
      // Log the notification
      await storage.logTeenNotification({
        teenProfileId: teenProfile?.id || 0,
        notificationType: type,
        deliveryMethod: notificationSettings.smsEnabled ? "sms" : "email",
        wasDelivered: true,
        wasOpened: false,
        createdAt: new Date()
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
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
}

export const notificationService = new NotificationService();