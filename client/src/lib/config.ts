// Configuration for API endpoints
export const API_CONFIG = {
  // Use absolute URL for mobile apps, relative for web
  baseUrl: typeof window !== 'undefined' && (window as any).Capacitor 
    ? 'https://the-mom-app.replit.app'
    : '', // Empty string for relative URLs in web browsers
  
  // Fallback servers for mobile connectivity
  fallbackUrls: [
    'https://the-mom-app.replit.app',
    'https://the-mom-app--replit.repl.co', // Alternative Replit domain
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