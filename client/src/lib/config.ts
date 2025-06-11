// Configuration for API endpoints
export const API_CONFIG = {
  // Use absolute URL for mobile apps, relative for web
  baseUrl: typeof window !== 'undefined' && (window as any).Capacitor 
    ? 'https://the-mom-app--1749632700457.prod.replit.app'
    : '', // Empty string for relative URLs in web browsers
};

export function getApiUrl(endpoint: string): string {
  return API_CONFIG.baseUrl + endpoint;
}