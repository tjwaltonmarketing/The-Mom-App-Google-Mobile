// Configuration for API endpoints  
export const API_CONFIG = {
  // Use current development server for mobile apps
  baseUrl: typeof window !== 'undefined' && (window as any).Capacitor 
    ? 'https://33f93ffa-c4c1-49d4-afd5-82cd21d7faa7-00-25cydufxpidmj.riker.replit.dev'
    : '', // Empty string for relative URLs in web browsers
  
  // Fallback servers for mobile connectivity
  fallbackUrls: [
    'https://33f93ffa-c4c1-49d4-afd5-82cd21d7faa7-00-25cydufxpidmj.riker.replit.dev',
    'https://the-mom-app.replit.app',
    'https://momapp-production.up.railway.app',
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