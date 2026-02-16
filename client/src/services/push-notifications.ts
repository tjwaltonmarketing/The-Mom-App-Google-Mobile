import { Capacitor, registerPlugin } from '@capacitor/core';
import { apiRequest } from '@/lib/queryClient';

interface FCMPluginInterface {
  getToken(): Promise<{ token: string }>;
  checkPermissions(): Promise<{ receive: string }>;
  requestPermissions(): Promise<{ receive: string }>;
  openNotificationSettings(): Promise<void>;
  debugNotificationPermission(): Promise<Record<string, any>>;
  addListener(event: string, callback: (data: any) => void): Promise<any>;
  removeAllListeners(): Promise<void>;
}

let fcmPlugin: FCMPluginInterface | null = null;
let listenersReady = false;
let permissionRequestInProgress = false;

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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForPlugin(maxAttempts = 5): Promise<FCMPluginInterface | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const plugin = getPlugin();
    if (plugin) {
      try {
        await plugin.checkPermissions();
        return plugin;
      } catch {
        console.log(`FCMPlugin not ready yet, attempt ${i + 1}/${maxAttempts}`);
      }
    }
    await delay(1000);
  }
  console.warn('FCMPlugin failed to become ready');
  return null;
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
  if (permissionRequestInProgress) {
    console.log('Permission request already in progress, skipping');
    return false;
  }

  const plugin = getPlugin();
  if (!plugin) return false;

  try {
    permissionRequestInProgress = true;
    await setupListeners();

    console.log('Calling plugin.requestPermissions()...');
    const permResult = await plugin.requestPermissions();
    console.log('requestPermissions result:', permResult.receive);

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
  } finally {
    permissionRequestInProgress = false;
  }
}

export async function setupPushNotifications(): Promise<boolean> {
  return requestAndRegisterPush();
}

export async function openNotificationSettings(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.openNotificationSettings();
  } catch (e) {
    console.warn('Failed to open notification settings via plugin, trying fallback:', e);
    try {
      const platform = Capacitor.getPlatform();
      if (platform === 'ios') {
        await (window as any).Capacitor?.Plugins?.App?.openUrl?.({ url: 'app-settings:' });
      }
    } catch (fallbackErr) {
      console.warn('Fallback settings open also failed:', fallbackErr);
    }
  }
}

export async function debugPushPermission(): Promise<Record<string, any> | null> {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    const result = await plugin.debugNotificationPermission();
    console.log('debugNotificationPermission result:', JSON.stringify(result));
    return result;
  } catch (e) {
    console.warn('debugNotificationPermission failed:', e);
    return null;
  }
}

export async function autoRequestPushPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    console.log('autoRequestPushPermission: waiting for plugin to be ready...');
    const plugin = await waitForPlugin(5);
    if (!plugin) {
      console.warn('autoRequestPushPermission: FCMPlugin never became ready');
      return false;
    }

    const debugInfo = await debugPushPermission();
    console.log('autoRequestPushPermission: debug info:', JSON.stringify(debugInfo));

    console.log('autoRequestPushPermission: plugin ready, checking status...');
    const status = await plugin.checkPermissions();
    console.log('autoRequestPushPermission: status =', status.receive);

    if (status.receive === 'granted') {
      await setupListeners();
      try {
        const tokenResult = await plugin.getToken();
        if (tokenResult?.token) {
          await saveTokenToServer(tokenResult.token);
        }
      } catch (e) {
        console.warn('Failed to get/save token:', e);
      }
      return true;
    }

    console.log('autoRequestPushPermission: not granted, requesting permission (waiting 2s for Activity)...');
    await delay(2000);

    const result = await requestAndRegisterPush();
    console.log('autoRequestPushPermission: request result =', result);

    if (!result) {
      localStorage.removeItem('push_prompt_dismissed');
    }

    return result;
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
