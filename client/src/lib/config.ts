// Configuration for API endpoints  
export const API_CONFIG = {
  // Use deployed URL for stable mobile connectivity
  baseUrl: typeof window !== 'undefined' && (window as any).Capacitor 
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
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    // Mobile app - use current server from fallback list
    return API_CONFIG.fallbackUrls[currentServerIndex] + endpoint;
  }
  return API_CONFIG.baseUrl + endpoint;
}

export function switchToNextServer(): boolean {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    currentServerIndex = (currentServerIndex + 1) % API_CONFIG.fallbackUrls.length;
    return currentServerIndex !== 0; // Return true if we have more servers to try
  }
  return false;
}