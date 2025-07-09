// Smart notification system for teen accounts
// Handles automated reminders so parents don't have to nag

export interface TeenNotificationSettings {
  taskReminders: boolean;
  eventNotifications: boolean;
  dailyDigest: boolean;
  quietHours: boolean;
  quietStart: string; // "22:00"
  quietEnd: string; // "08:00"
}

export interface NotificationTemplate {
  id: string;
  type: "task_reminder" | "task_overdue" | "event_reminder" | "daily_digest" | "encouragement";
  title: string;
  body: string;
  urgency: "low" | "medium" | "high";
  cooldownHours: number; // Minimum time between similar notifications
}

// Notification templates designed to be helpful, not annoying
export const TEEN_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  // Task Reminders (Progressive intensity)
  {
    id: "task_reminder_gentle",
    type: "task_reminder",
    title: "Friendly Reminder 📝",
    body: "Hey {name}! Don't forget about {task} - it's due {timeframe}",
    urgency: "low",
    cooldownHours: 4,
  },
  {
    id: "task_reminder_urgent",
    type: "task_reminder", 
    title: "Task Due Soon ⏰",
    body: "{task} is due in {timeframe}. Quick reminder so you don't forget!",
    urgency: "medium",
    cooldownHours: 2,
  },
  {
    id: "task_overdue_first",
    type: "task_overdue",
    title: "Oops! Task Overdue 😅",
    body: "{task} was due {timeframe}. No worries - just get it done when you can!",
    urgency: "medium",
    cooldownHours: 6,
  },
  {
    id: "task_overdue_escalated",
    type: "task_overdue",
    title: "Still Need to Complete 📋",
    body: "{task} is still pending. Your parents might start asking about it soon...",
    urgency: "high",
    cooldownHours: 12,
  },
  
  // Event Reminders
  {
    id: "event_reminder_day",
    type: "event_reminder",
    title: "Tomorrow's Schedule 📅",
    body: "Don't forget: {event} tomorrow at {time}",
    urgency: "low",
    cooldownHours: 24,
  },
  {
    id: "event_reminder_hour",
    type: "event_reminder",
    title: "Event Starting Soon 🚀",
    body: "{event} starts in 1 hour at {time}",
    urgency: "medium",
    cooldownHours: 1,
  },

  // Daily Digest
  {
    id: "daily_digest_morning",
    type: "daily_digest",
    title: "Good Morning! ☀️",
    body: "You have {taskCount} tasks today. Start with {priorityTask} to stay ahead!",
    urgency: "low",
    cooldownHours: 24,
  },
  
  // Encouragement (When they complete tasks)
  {
    id: "encouragement_streak",
    type: "encouragement",
    title: "You're on Fire! 🔥",
    body: "{streak} days of completing tasks! Your parents are definitely impressed.",
    urgency: "low",
    cooldownHours: 48,
  },
  {
    id: "encouragement_completion",
    type: "encouragement", 
    title: "Nice Work! 🎉",
    body: "Task completed! +{points} points. Keep it up!",
    urgency: "low",
    cooldownHours: 1,
  },
];

export class TeenNotificationEngine {
  
  // Smart scheduling based on urgency and teen preferences
  static calculateNotificationTiming(
    task: any,
    settings: TeenNotificationSettings,
    lastNotificationTime?: Date
  ): Date[] {
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const timeUntilDue = dueDate.getTime() - now.getTime();
    const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);
    
    const notifications: Date[] = [];

    // Respect quiet hours
    const isQuietTime = (time: Date) => {
      if (!settings.quietHours) return false;
      const hour = time.getHours();
      const quietStart = parseInt(settings.quietStart.split(':')[0]);
      const quietEnd = parseInt(settings.quietEnd.split(':')[0]);
      
      if (quietStart > quietEnd) {
        // Quiet hours cross midnight (e.g., 22:00 to 08:00)
        return hour >= quietStart || hour <= quietEnd;
      } else {
        return hour >= quietStart && hour <= quietEnd;
      }
    };

    // Schedule based on urgency
    if (hoursUntilDue > 48) {
      // More than 2 days: Gentle reminder 24 hours before
      const reminderTime = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
      if (!isQuietTime(reminderTime)) notifications.push(reminderTime);
      
    } else if (hoursUntilDue > 24) {
      // 1-2 days: Reminder tomorrow morning
      const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      reminderTime.setHours(9, 0, 0, 0); // 9 AM next day
      if (!isQuietTime(reminderTime)) notifications.push(reminderTime);
      
    } else if (hoursUntilDue > 4) {
      // Same day: Gentle reminder 4 hours before
      const reminderTime = new Date(dueDate.getTime() - 4 * 60 * 60 * 1000);
      if (!isQuietTime(reminderTime)) notifications.push(reminderTime);
      
    } else if (hoursUntilDue > 1) {
      // Last few hours: Urgent reminder 1 hour before
      const reminderTime = new Date(dueDate.getTime() - 60 * 60 * 1000);
      if (!isQuietTime(reminderTime)) notifications.push(reminderTime);
      
    } else if (hoursUntilDue < 0) {
      // Overdue: Progressive reminders
      const overdueDays = Math.floor(Math.abs(hoursUntilDue) / 24);
      
      if (overdueDays === 0) {
        // First day overdue: Gentle reminder after 2 hours
        const reminderTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        if (!isQuietTime(reminderTime)) notifications.push(reminderTime);
        
      } else if (overdueDays === 1) {
        // Second day: More urgent
        const reminderTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        if (!isQuietTime(reminderTime)) notifications.push(reminderTime);
        
      } else if (overdueDays >= 2) {
        // Multiple days overdue: Daily reminders (parents will be asking!)
        const reminderTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);
        if (!isQuietTime(reminderTime)) notifications.push(reminderTime);
      }
    }

    return notifications.filter(time => time > now);
  }

  // Choose appropriate notification template based on context
  static selectNotificationTemplate(
    task: any,
    context: {
      daysOverdue?: number;
      reminderCount: number;
      timeUntilDue: number; // in hours
    }
  ): NotificationTemplate {
    const { daysOverdue = 0, reminderCount, timeUntilDue } = context;

    if (daysOverdue > 0) {
      // Overdue task
      if (reminderCount === 0 || daysOverdue === 1) {
        return TEEN_NOTIFICATION_TEMPLATES.find(t => t.id === "task_overdue_first")!;
      } else {
        return TEEN_NOTIFICATION_TEMPLATES.find(t => t.id === "task_overdue_escalated")!;
      }
    } else if (timeUntilDue <= 4) {
      // Due soon
      return TEEN_NOTIFICATION_TEMPLATES.find(t => t.id === "task_reminder_urgent")!;
    } else {
      // Regular reminder
      return TEEN_NOTIFICATION_TEMPLATES.find(t => t.id === "task_reminder_gentle")!;
    }
  }

  // Format notification with dynamic content
  static formatNotification(
    template: NotificationTemplate,
    data: {
      name: string;
      task?: string;
      timeframe?: string;
      event?: string;
      time?: string;
      taskCount?: number;
      priorityTask?: string;
      streak?: number;
      points?: number;
    }
  ): { title: string; body: string } {
    let { title, body } = template;

    // Replace placeholders with actual data
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      title = title.replace(placeholder, String(value));
      body = body.replace(placeholder, String(value));
    });

    return { title, body };
  }

  // Generate friendly timeframe descriptions
  static getTimeframeDescription(date: Date): string {
    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < -24) {
      const days = Math.floor(Math.abs(diffHours) / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else if (diffHours < -1) {
      const hours = Math.floor(Math.abs(diffHours));
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 0) {
      return "just now";
    } else if (diffHours < 1) {
      return "in less than an hour";
    } else if (diffHours < 24) {
      const hours = Math.floor(diffHours);
      return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (diffHours < 48) {
      return "tomorrow";
    } else {
      const days = Math.floor(diffHours / 24);
      return `in ${days} day${days !== 1 ? 's' : ''}`;
    }
  }

  // Main function to schedule notifications for a teen
  static async scheduleTaskNotifications(
    teenId: number,
    task: any,
    settings: TeenNotificationSettings
  ): Promise<void> {
    if (!settings.taskReminders) return;

    const notificationTimes = this.calculateNotificationTiming(task, settings);
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const timeUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    for (const scheduledTime of notificationTimes) {
      const template = this.selectNotificationTemplate(task, {
        reminderCount: 0, // This would come from database
        timeUntilDue,
      });

      const { title, body } = this.formatNotification(template, {
        name: "there", // Would use actual teen name
        task: task.title,
        timeframe: this.getTimeframeDescription(dueDate),
      });

      // Schedule the notification (would integrate with push notification service)
      console.log(`Scheduling notification for ${scheduledTime}:`, { title, body });
      
      // In real implementation, this would:
      // 1. Save to notifications table
      // 2. Schedule with push notification service (Firebase/Expo)
      // 3. Track delivery and engagement
    }
  }
}

// Example usage scenarios:

// Scenario 1: Teen gets assigned "Take out trash" due tomorrow
// Result: Gentle reminder tonight, urgent reminder 1 hour before due

// Scenario 2: Teen ignores "Clean room" for 2 days  
// Result: Progressive reminders getting more direct about parents asking

// Scenario 3: Teen completes streak of tasks
// Result: Encouragement notification celebrating their success

// Scenario 4: Teen has quiet hours 10pm-8am
// Result: All notifications respect their sleep schedule

export default TeenNotificationEngine;