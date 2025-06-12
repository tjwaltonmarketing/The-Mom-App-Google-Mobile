import { getApiUrl } from "./config";

export async function testServerConnectivity(): Promise<{
  success: boolean;
  server: string;
  error?: string;
  responseTime?: number;
}> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(getApiUrl('/api/health'), {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      success: response.ok,
      server: getApiUrl(''),
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      server: getApiUrl(''),
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function isMobileApp(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
}

export function getNetworkInfo(): {
  isMobile: boolean;
  userAgent: string;
  platform: string;
} {
  return {
    isMobile: isMobileApp(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'
  };
}