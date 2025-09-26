import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { apiRequest } from '@/lib/queryClient';

export interface PushNotificationService {
  initialize(): Promise<void>;
  requestPermissions(): Promise<boolean>;
  registerForNotifications(): Promise<void>;
  getToken(): Promise<string | null>;
  saveTokenToServer(token: string): Promise<void>;
  cleanup(): Promise<void>;
}

class CapacitorPushNotificationService implements PushNotificationService {
  private isInitialized = false;
  private currentToken: string | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized || !Capacitor.isNativePlatform()) {
      return;
    }

    console.log('Initializing push notifications...');

    // Add listeners for push notification events
    PushNotifications.addListener('registration', (token: Token) => {
      console.info('Registration token: ', token.value);
      this.currentToken = token.value;
      this.saveTokenToServer(token.value);
    });

    PushNotifications.addListener('registrationError', (err: any) => {
      console.error('Registration error: ', err.error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received: ', notification);
      // Handle foreground notifications
      this.handleForegroundNotification(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed', notification);
      // Handle notification tap/action
      this.handleNotificationAction(notification);
    });

    this.isInitialized = true;
  }

  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications are only available on native platforms');
      return false;
    }

    try {
      const result = await PushNotifications.requestPermissions();
      console.log('Permission result:', result);
      
      if (result.receive === 'granted') {
        console.log('Push notification permissions granted');
        return true;
      } else {
        console.log('Push notification permissions denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  async registerForNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Registration is only available on native platforms');
      return;
    }

    try {
      await PushNotifications.register();
      console.log('Successfully registered for push notifications');
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      throw error;
    }
  }

  async getToken(): Promise<string | null> {
    return this.currentToken;
  }

  async saveTokenToServer(token: string): Promise<void> {
    try {
      const platform = Capacitor.getPlatform();
      const deviceInfo = {
        platform: platform,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      await apiRequest('/api/push-tokens', {
        method: 'POST',
        body: JSON.stringify({
          token,
          platform,
          deviceInfo,
        }),
      });

      console.log('Push token saved to server successfully');
    } catch (error) {
      console.error('Failed to save push token to server:', error);
      // Don't throw error here - save attempt failing shouldn't break the app
    }
  }

  private handleForegroundNotification(notification: PushNotificationSchema): void {
    console.log('Handling foreground notification:', notification);
    
    // You can customize this to show in-app notifications
    // For example, using a toast or custom notification component
    
    // If you want to show a browser notification when app is in foreground:
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || 'Mom App', {
        body: notification.body,
        icon: '/icon-192.png', // Adjust path as needed
        tag: notification.id || 'mom-app-notification',
      });
    }
  }

  private handleNotificationAction(action: ActionPerformed): void {
    console.log('Handling notification action:', action);
    
    const data = action.notification.data;
    
    // Handle different notification types based on data
    if (data?.type === 'task') {
      // Navigate to tasks page
      window.location.href = '/teen/tasks';
    } else if (data?.type === 'event') {
      // Navigate to calendar page
      window.location.href = '/teen/calendar';
    } else if (data?.type === 'notification') {
      // Navigate to notifications
      window.location.href = '/teen';
    }
    
    // You can also use your router here instead of window.location
    // For example, if using wouter:
    // import { navigate } from 'wouter/use-location';
    // navigate('/teen/tasks');
  }

  async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Remove all listeners
      await PushNotifications.removeAllListeners();
      this.isInitialized = false;
      this.currentToken = null;
      console.log('Push notifications service cleaned up');
    } catch (error) {
      console.error('Error cleaning up push notifications:', error);
    }
  }
}

// Web fallback service for non-native platforms
class WebPushNotificationService implements PushNotificationService {
  async initialize(): Promise<void> {
    console.log('Web push notifications not implemented yet');
  }

  async requestPermissions(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async registerForNotifications(): Promise<void> {
    console.log('Web push registration not implemented yet');
  }

  async getToken(): Promise<string | null> {
    return null;
  }

  async saveTokenToServer(token: string): Promise<void> {
    console.log('Web push token save not implemented yet');
  }

  async cleanup(): Promise<void> {
    console.log('Web push cleanup not needed');
  }
}

// Factory function to get the appropriate service
export function createPushNotificationService(): PushNotificationService {
  if (Capacitor.isNativePlatform()) {
    return new CapacitorPushNotificationService();
  } else {
    return new WebPushNotificationService();
  }
}

// Singleton instance
let pushNotificationService: PushNotificationService | null = null;

export function getPushNotificationService(): PushNotificationService {
  if (!pushNotificationService) {
    pushNotificationService = createPushNotificationService();
  }
  return pushNotificationService;
}

// Convenience function to set up push notifications
export async function setupPushNotifications(): Promise<boolean> {
  try {
    const service = getPushNotificationService();
    
    await service.initialize();
    
    const permissionGranted = await service.requestPermissions();
    if (!permissionGranted) {
      console.log('Push notification permissions not granted');
      return false;
    }
    
    await service.registerForNotifications();
    console.log('Push notifications setup completed successfully');
    return true;
  } catch (error) {
    console.error('Failed to setup push notifications:', error);
    return false;
  }
}