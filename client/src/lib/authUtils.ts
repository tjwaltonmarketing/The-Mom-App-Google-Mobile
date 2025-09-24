// Authentication utility functions for Replit Auth integration

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Helper function to handle unauthorized errors consistently
export function handleUnauthorizedError(toast: any) {
  toast({
    title: "Unauthorized", 
    description: "You are logged out. Logging in again...",
    variant: "destructive",
  });
  
  setTimeout(() => {
    window.location.href = "/api/login";
  }, 500); // Wait for 0.5 second before redirecting
}