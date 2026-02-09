export async function initializePushListeners(): Promise<boolean> {
  console.log('Push notifications: native registration disabled (pending native debugging)');
  return false;
}

export async function checkPushPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
  return 'denied';
}

export async function requestAndRegisterPush(): Promise<boolean> {
  console.log('Push notifications: native registration disabled (pending native debugging)');
  return false;
}

export async function setupPushNotifications(): Promise<boolean> {
  console.log('Push notifications: native registration disabled (pending native debugging)');
  return false;
}
