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
  private PushNotificationsPlugin: any = null;

  private async loadPlugin(): Promise<any> {
    if (this.PushNotificationsPlugin) return this.PushNotificationsPlugin;
    try {
      const mod = await import('@capacitor/push-notifications');
      this.PushNotificationsPlugin = mod.PushNotifications;
      return this.PushNotificationsPlugin;
    } catch (error) {
      console.warn('Push notifications plugin not available:', error);
      return null;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const PushNotifications = await this.loadPlugin();
      if (!PushNotifications) {
        console.warn('Push notifications plugin could not be loaded, skipping initialization');
        return;
      }

      console.log('Initializing push notifications...');

      PushNotifications.addListener('registration', (token: any) => {
        console.info('Registration token: ', token.value);
        this.currentToken = token.value;
        this.saveTokenToServer(token.value);
      });

      PushNotifications.addListener('registrationError', (err: any) => {
        console.warn('Push notification registration error (non-fatal):', err?.error || err);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('Push notification received: ', notification);
        this.handleForegroundNotification(notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
        console.log('Push notification action performed', notification);
        this.handleNotificationAction(notification);
      });

      this.isInitialized = true;
    } catch (error) {
      console.warn('Push notification initialization failed (non-fatal):', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const PushNotifications = await this.loadPlugin();
      if (!PushNotifications) return false;

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
      console.warn('Error requesting push permissions (non-fatal):', error);
      return false;
    }
  }

  async registerForNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const PushNotifications = await this.loadPlugin();
      if (!PushNotifications) return;

      await PushNotifications.register();
      console.log('Successfully registered for push notifications');
    } catch (error) {
      console.warn('Error registering for push notifications (non-fatal):', error);
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
      console.warn('Failed to save push token to server (non-fatal):', error);
    }
  }

  private handleForegroundNotification(notification: any): void {
    console.log('Handling foreground notification:', notification);
    
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title || 'Mom App', {
          body: notification.body,
          icon: '/icon-192.png',
          tag: notification.id || 'mom-app-notification',
        });
      }
    } catch (error) {
      console.warn('Error showing foreground notification:', error);
    }
  }

  private handleNotificationAction(action: any): void {
    console.log('Handling notification action:', action);
    
    try {
      const data = action.notification.data;
      
      if (data?.type === 'task') {
        window.location.href = '/teen/tasks';
      } else if (data?.type === 'event') {
        window.location.href = '/teen/calendar';
      } else if (data?.type === 'notification') {
        window.location.href = '/teen';
      }
    } catch (error) {
      console.warn('Error handling notification action:', error);
    }
  }

  async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      const PushNotifications = await this.loadPlugin();
      if (PushNotifications) {
        await PushNotifications.removeAllListeners();
      }
      this.isInitialized = false;
      this.currentToken = null;
      console.log('Push notifications service cleaned up');
    } catch (error) {
      console.warn('Error cleaning up push notifications:', error);
    }
  }
}

class WebPushNotificationService implements PushNotificationService {
  async initialize(): Promise<void> {
    console.log('Web push notifications not implemented yet');
  }

  async requestPermissions(): Promise<boolean> {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch {
        return false;
      }
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

export function createPushNotificationService(): PushNotificationService {
  if (Capacitor.isNativePlatform()) {
    return new CapacitorPushNotificationService();
  } else {
    return new WebPushNotificationService();
  }
}

let pushNotificationService: PushNotificationService | null = null;

export function getPushNotificationService(): PushNotificationService {
  if (!pushNotificationService) {
    pushNotificationService = createPushNotificationService();
  }
  return pushNotificationService;
}

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
    console.warn('Failed to setup push notifications (non-fatal):', error);
    return false;
  }
}
