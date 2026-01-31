// Configuration for API endpoints

// More robust check for Capacitor native environment
function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as any).Capacitor;
  // Must have Capacitor AND be native (not just web with Capacitor installed)
  return capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform();
}

export const API_CONFIG = {
  // Use deployed URL for stable mobile connectivity
  baseUrl: isNativeApp() 
    ? 'https://the-mom-app.replit.app'
    : '', // Empty string for relative URLs in web browsers
  
  // Multiple servers for mobile connectivity resilience
  fallbackUrls: [
    'https://the-mom-app.replit.app', // Primary deployed URL
    'https://134c9088-4fec-4b3e-a93f-a65d7b950047-00-1zwfp1p4y7fva.worf.replit.dev',
    'https://33f93ffa-c4c1-49d4-afd5-82cd21d7faa7-00-25cydufxpidmj.riker.replit.dev',
  ]
};

let currentServerIndex = 0;

export function getApiUrl(endpoint: string): string {
  if (isNativeApp()) {
    // Mobile app - use current server from fallback list
    return API_CONFIG.fallbackUrls[currentServerIndex] + endpoint;
  }
  return endpoint; // Use relative URL for web browsers
}

export function switchToNextServer(): boolean {
  if (isNativeApp()) {
    currentServerIndex = (currentServerIndex + 1) % API_CONFIG.fallbackUrls.length;
    return currentServerIndex !== 0; // Return true if we have more servers to try
  }
  return false;
}