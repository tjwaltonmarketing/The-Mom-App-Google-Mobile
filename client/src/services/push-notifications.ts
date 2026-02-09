import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
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
    if (this.isInitialized) {
      console.log('Push notifications already initialized, skipping');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('Not a native platform, skipping Capacitor push init');
      return;
    }

    try {
      console.log('Setting up push notification listeners...');

      try {
        await PushNotifications.removeAllListeners();
      } catch (e) {
        // ignore cleanup errors
      }

      await PushNotifications.addListener('registration', (token) => {
        try {
          console.info('Registration token: ', token.value);
          this.currentToken = token.value;
          this.saveTokenToServer(token.value).catch(err => {
            console.warn('Failed to save token (non-fatal):', err);
          });
        } catch (error) {
          console.warn('Error in registration handler (non-fatal):', error);
        }
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.warn('Push notification registration error (non-fatal):', JSON.stringify(err));
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        try {
          console.log('Push notification received: ', notification);
          this.handleForegroundNotification(notification);
        } catch (error) {
          console.warn('Error handling received notification (non-fatal):', error);
        }
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        try {
          console.log('Push notification action performed', notification);
          this.handleNotificationAction(notification);
        } catch (error) {
          console.warn('Error handling notification action (non-fatal):', error);
        }
      });

      this.isInitialized = true;
      console.log('Push notifications listeners registered successfully');
    } catch (error) {
      console.warn('Push notification initialization failed (non-fatal):', error);
      this.isInitialized = false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not native platform, skipping permission request');
      return false;
    }

    try {
      let currentStatus: any;
      try {
        currentStatus = await PushNotifications.checkPermissions();
        console.log('Current push notification permission status:', JSON.stringify(currentStatus));
      } catch (checkError) {
        console.warn('Error checking permissions (non-fatal):', checkError);
        currentStatus = { receive: 'prompt' };
      }

      if (currentStatus.receive === 'granted') {
        console.log('Push notification permissions already granted');
        return true;
      }

      console.log('Requesting push notification permissions from user...');
      const result = await PushNotifications.requestPermissions();
      console.log('Permission request result:', JSON.stringify(result));
      
      if (result.receive === 'granted') {
        console.log('Push notification permissions granted by user');
        return true;
      } else {
        console.log('Push notification permissions denied by user, result:', result.receive);
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
      await new Promise(resolve => setTimeout(resolve, 500));
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
      await PushNotifications.removeAllListeners();
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
    console.log('Web push notifications: skipping native init');
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
    console.log('=== Push Notification Setup Starting ===');
    console.log('Platform:', Capacitor.getPlatform(), '| Native:', Capacitor.isNativePlatform());
    
    if (!Capacitor.isNativePlatform()) {
      console.log('Not a native platform, skipping push notification setup');
      return false;
    }

    const service = getPushNotificationService();
    
    console.log('Step 1: Initializing service (setting up listeners)...');
    await service.initialize();
    
    console.log('Step 2: Requesting permissions...');
    let permissionGranted = false;
    try {
      permissionGranted = await service.requestPermissions();
    } catch (permError) {
      console.warn('Permission request threw error (non-fatal):', permError);
      return false;
    }

    if (!permissionGranted) {
      console.log('Push notification permissions not granted, stopping setup');
      return false;
    }
    
    console.log('Step 3: Registering for notifications...');
    try {
      await service.registerForNotifications();
    } catch (regError) {
      console.warn('Registration threw error (non-fatal):', regError);
      return false;
    }

    console.log('=== Push Notification Setup Complete ===');
    return true;
  } catch (error) {
    console.warn('Failed to setup push notifications (non-fatal):', error);
    return false;
  }
}
