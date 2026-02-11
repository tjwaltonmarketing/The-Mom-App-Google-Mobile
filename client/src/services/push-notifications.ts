import { Capacitor, registerPlugin } from '@capacitor/core';
import { apiRequest } from '@/lib/queryClient';

interface FCMPluginInterface {
  getToken(): Promise<{ token: string }>;
  checkPermissions(): Promise<{ receive: string }>;
  requestPermissions(): Promise<{ receive: string }>;
  addListener(event: string, callback: (data: any) => void): Promise<any>;
  removeAllListeners(): Promise<void>;
}

let fcmPlugin: FCMPluginInterface | null = null;
let listenersReady = false;

function getPlugin(): FCMPluginInterface | null {
  if (!Capacitor.isNativePlatform()) return null;
  if (!fcmPlugin) {
    try {
      fcmPlugin = registerPlugin<FCMPluginInterface>('FCMPlugin');
    } catch (e) {
      console.warn('Failed to register FCMPlugin:', e);
      return null;
    }
  }
  return fcmPlugin;
}

async function setupListeners(): Promise<void> {
  if (listenersReady) return;
  const plugin = getPlugin();
  if (!plugin) return;

  try {
    await plugin.addListener('fcmTokenReceived', (data: any) => {
      console.log('FCM token received via listener');
      saveTokenToServer(data.token).catch(() => {});
    });

    await plugin.addListener('pushNotificationReceived', (data: any) => {
      console.log('Push received in foreground:', data);
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title || 'The Mom App', {
            body: data.body,
            icon: '/icon-192.png',
          });
        }
      } catch (_) {}
    });

    listenersReady = true;
  } catch (e) {
    console.warn('Failed to set up FCM listeners:', e);
  }
}

async function saveTokenToServer(token: string): Promise<void> {
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

export async function initializePushListeners(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await setupListeners();
    return true;
  } catch {
    return false;
  }
}

export async function checkPushPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
  const plugin = getPlugin();
  if (!plugin) return 'denied';
  try {
    const result = await plugin.checkPermissions();
    return result.receive as 'granted' | 'denied' | 'prompt';
  } catch {
    return 'denied';
  }
}

export async function requestAndRegisterPush(): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;

  try {
    await setupListeners();

    const permResult = await plugin.requestPermissions();
    if (permResult.receive !== 'granted') {
      return false;
    }

    const tokenResult = await plugin.getToken();
    if (tokenResult?.token) {
      console.log('FCM token obtained successfully');
      await saveTokenToServer(tokenResult.token);
      return true;
    }

    return false;
  } catch (e) {
    console.warn('Push registration failed:', e);
    return false;
  }
}

export async function setupPushNotifications(): Promise<boolean> {
  return requestAndRegisterPush();
}

export async function autoRequestPushPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const plugin = getPlugin();
    if (!plugin) return false;

    const status = await plugin.checkPermissions();
    if (status.receive === 'granted') {
      await setupListeners();
      const tokenResult = await plugin.getToken();
      if (tokenResult?.token) {
        await saveTokenToServer(tokenResult.token);
      }
      return true;
    }

    if (status.receive === 'prompt') {
      localStorage.removeItem('push_prompt_dismissed');
      return requestAndRegisterPush();
    }

    return false;
  } catch (e) {
    console.warn('Auto push permission request failed:', e);
    return false;
  }
}

export function setupNotificationTapHandler(navigate: (route: string) => void): void {
  if (!Capacitor.isNativePlatform()) return;

  (window as any).__NOTIFICATION_HANDLER__ = (route: string) => {
    if (route && route !== '/') {
      navigate(route);
    }
  };

  const pendingRoute = (window as any).__NOTIFICATION_ROUTE__;
  if (pendingRoute && pendingRoute !== '/') {
    navigate(pendingRoute);
    (window as any).__NOTIFICATION_ROUTE__ = null;
  }
}
