// Configuration for API endpoints

function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
}

export const API_CONFIG = {
  // Use deployed URL for stable mobile connectivity
  baseUrl: isNativeApp()
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
  if (isNativeApp()) {
    // Mobile app - use current server from fallback list
    return API_CONFIG.fallbackUrls[currentServerIndex] + endpoint;
  }
  return API_CONFIG.baseUrl + endpoint;
}

export function switchToNextServer(): boolean {
  if (isNativeApp()) {
    currentServerIndex = (currentServerIndex + 1) % API_CONFIG.fallbackUrls.length;
    return currentServerIndex !== 0; // Return true if we have more servers to try
  }
  return false;
}

export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
  document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=None; Secure`;
}

export function clearAuthToken(): void {
  localStorage.removeItem('auth_token');
  document.cookie = 'auth_token=; path=/; max-age=0; SameSite=None; Secure';
}