import { Capacitor } from '@capacitor/core';
import { apiRequest } from '@/lib/queryClient';

let pushService: NativePushService | null = null;

class NativePushService {
  private isListenersReady = false;
  private currentToken: string | null = null;
  private PushNotificationsModule: any = null;

  async loadPlugin(): Promise<boolean> {
    if (this.PushNotificationsModule) return true;
    try {
      const mod = await import('@capacitor/push-notifications');
      this.PushNotificationsModule = mod.PushNotifications;
      return true;
    } catch (e) {
      console.warn('Failed to load PushNotifications plugin:', e);
      return false;
    }
  }

  async setupListeners(): Promise<boolean> {
    if (this.isListenersReady) return true;

    const loaded = await this.loadPlugin();
    if (!loaded) return false;

    const PN = this.PushNotificationsModule;

    try {
      await PN.removeAllListeners();
    } catch (_) {}

    try {
      await PN.addListener('registration', (token: any) => {
        console.info('FCM token received:', token.value);
        this.currentToken = token.value;
        this.saveTokenToServer(token.value).catch(() => {});
      });

      await PN.addListener('registrationError', (err: any) => {
        console.warn('Push registration error:', JSON.stringify(err));
      });

      await PN.addListener('pushNotificationReceived', (notification: any) => {
        console.log('Push received in foreground:', notification);
        this.showForegroundNotification(notification);
      });

      await PN.addListener('pushNotificationActionPerformed', (action: any) => {
        console.log('Push action performed:', action);
        this.handleNotificationTap(action);
      });

      this.isListenersReady = true;
      return true;
    } catch (e) {
      console.warn('Failed to set up push listeners:', e);
      return false;
    }
  }

  async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    const loaded = await this.loadPlugin();
    if (!loaded) return 'denied';
    try {
      const status = await this.PushNotificationsModule.checkPermissions();
      return status.receive as 'granted' | 'denied' | 'prompt';
    } catch {
      return 'denied';
    }
  }

  async requestPermission(): Promise<boolean> {
    const loaded = await this.loadPlugin();
    if (!loaded) return false;
    try {
      const result = await this.PushNotificationsModule.requestPermissions();
      return result.receive === 'granted';
    } catch {
      return false;
    }
  }

  async register(): Promise<boolean> {
    const loaded = await this.loadPlugin();
    if (!loaded) return false;

    try {
      await this.setupListeners();
      await new Promise(resolve => setTimeout(resolve, 300));
      await this.PushNotificationsModule.register();
      return true;
    } catch (e) {
      console.warn('Push register() failed:', e);
      return false;
    }
  }

  async saveTokenToServer(token: string): Promise<void> {
    try {
      const platform = Capacitor.getPlatform();
      await apiRequest('/api/push-tokens', {
        method: 'POST',
        body: JSON.stringify({
          token,
          platform,
          deviceInfo: {
            platform,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      });
      console.log('Push token saved to server');
    } catch (e) {
      console.warn('Failed to save push token:', e);
    }
  }

  getToken(): string | null {
    return this.currentToken;
  }

  private showForegroundNotification(notification: any): void {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title || 'The Mom App', {
          body: notification.body,
          icon: '/icon-192.png',
          tag: notification.id || 'mom-app-notification',
        });
      }
    } catch (_) {}
  }

  private handleNotificationTap(action: any): void {
    try {
      const data = action.notification?.data;
      if (data?.type === 'task') {
        window.location.href = '/teen/tasks';
      } else if (data?.type === 'event') {
        window.location.href = '/teen/calendar';
      } else if (data?.type === 'notification') {
        window.location.href = '/teen';
      }
    } catch (_) {}
  }

  async cleanup(): Promise<void> {
    if (!this.isListenersReady || !this.PushNotificationsModule) return;
    try {
      await this.PushNotificationsModule.removeAllListeners();
      this.isListenersReady = false;
      this.currentToken = null;
    } catch (_) {}
  }
}

function getService(): NativePushService | null {
  if (!Capacitor.isNativePlatform()) return null;
  if (!pushService) {
    pushService = new NativePushService();
  }
  return pushService;
}

export async function initializePushListeners(): Promise<boolean> {
  const svc = getService();
  if (!svc) return false;
  return svc.setupListeners();
}

export async function checkPushPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
  const svc = getService();
  if (!svc) return 'denied';
  return svc.checkPermission();
}

export async function requestAndRegisterPush(): Promise<boolean> {
  const svc = getService();
  if (!svc) return false;

  const listenersOk = await svc.setupListeners();
  if (!listenersOk) return false;

  const granted = await svc.requestPermission();
  if (!granted) return false;

  return svc.register();
}

export async function setupPushNotifications(): Promise<boolean> {
  return requestAndRegisterPush();
}
