// Configuration for API endpoints
export const API_CONFIG = {
  // Use absolute URL for mobile apps, relative for web
  baseUrl: typeof window !== 'undefined' && (window as any).Capacitor 
    ? 'https://67b8e2ce-3754-4ba9-b476-c7e60b58ab5c-00-1t2s4r2uy6v68.kirk.replit.dev'
    : '', // Empty string for relative URLs in web browsers
};

export function getApiUrl(endpoint: string): string {
  return API_CONFIG.baseUrl + endpoint;
}