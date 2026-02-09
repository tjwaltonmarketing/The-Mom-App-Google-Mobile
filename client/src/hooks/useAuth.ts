import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/config";

function getStoredAuthToken(): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('auth_token');
  }
  return null;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      const token = getStoredAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const fullUrl = getApiUrl("/api/auth/user");
      const response = await fetch(fullUrl, {
        credentials: "include",
        headers,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      // Clear token from localStorage for mobile compatibility
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('auth_token');
        // Reset theme to light mode on logout
        localStorage.setItem('mom-app-theme', 'light');
      }
      
      // Clear cookie by setting it to expire
      if (typeof document !== 'undefined') {
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        // Remove dark mode class from document
        document.documentElement.classList.remove('dark', 'blue-light-filter');
      }
      
      // Clear all cached data
      queryClient.clear();
      
      // Small delay to ensure logout completes, then redirect
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 100);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}