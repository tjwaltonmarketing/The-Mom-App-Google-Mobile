import { registerPlugin, Capacitor } from '@capacitor/core';

interface FacebookEventsPlugin {
  logEvent(options: { eventName: string }): Promise<void>;
}

const FacebookEventsNative = registerPlugin<FacebookEventsPlugin>('FacebookEvents');

export const FB_EVENTS = {
  COMPLETE_REGISTRATION: 'fb_mobile_complete_registration',
  INITIATE_CHECKOUT: 'fb_mobile_initiated_checkout',
  START_TRIAL: 'StartTrial',
  SUBSCRIBE: 'Subscribe',
};

export async function logFBEvent(eventName: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await FacebookEventsNative.logEvent({ eventName });
  } catch {
    // Silently fail — never break the app over analytics
  }
}
