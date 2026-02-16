// Configuration for API endpoints  
export const API_CONFIG = {
  // Use deployed URL for stable mobile connectivity
  baseUrl: typeof window !== 'undefined' && (window as any).Capacitor 
    ? 'https://app.themom.app'
    : '', // Empty string for relative URLs in web browsers
  
  // Multiple servers for mobile connectivity resilience
  fallbackUrls: [
    'https://app.themom.app', // Primary custom domain
    'https://the-mom-app.replit.app', // Replit deployment URL
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