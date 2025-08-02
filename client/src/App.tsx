import { useState } from "react";
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { SplashScreen } from "@/components/splash-screen";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import Calendar from "@/pages/calendar";
import Tasks from "@/pages/tasks";
import TeenLogin from "@/pages/teen-login";
import TeenOnboarding from "@/pages/teen-onboarding";
import TeenDashboard from "@/pages/teen-dashboard";
import TeenTasks from "@/pages/teen-tasks";
import TeenCalendar from "@/pages/teen-calendar";
import TeenPasswords from "@/pages/teen-passwords";
import TeenProfile from "@/pages/teen-profile";
import MealPlan from "@/pages/meal-plan";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        if (error?.message?.includes('401')) return false;
        return failureCount < 3;
      },
    },
  },
});

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [splashCompleted, setSplashCompleted] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Always call useQuery hook - hooks must be called in the same order every render
  const { data: teenData, isLoading: teenLoading, error: teenError } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    queryFn: async () => {
      console.log("Fetching teen auth data...");
      const response = await fetch("/api/teen/auth/user", {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Teen auth response status:", response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.log("Teen auth error response:", errorText);
        throw new Error("Not authenticated");
      }
      const data = await response.json();
      console.log("Teen auth success data:", data);
      return data;
    },
    retry: false,
    enabled: true, // Always check for teen auth
    staleTime: 0, // Always refetch to ensure we get fresh session data
    gcTime: 0, // Don't cache teen auth data (v5 uses gcTime instead of cacheTime)
  });
  
  const isTeenUser = !!teenData && !teenError;

  // Debug authentication state
  console.log("Auth state:", { 
    isAuthenticated, 
    isLoading, 
    hasUser: !!user, 
    isTeenUser, 
    teenData: !!teenData, 
    teenLoading,
    teenError: teenError?.message,
    enabled: true,
    rawTeenData: teenData,
    routeCondition: teenData && !teenError
  });

  // Show splash screen on initial load for a minimum duration
  if (!splashCompleted && initialLoad) {
    return (
      <SplashScreen 
        isLoading={isLoading || teenLoading} 
        onComplete={() => {
          setSplashCompleted(true);
          setInitialLoad(false);
        }} 
      />
    );
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/teen/login" component={TeenLogin} />
      <Route path="/teen-login" component={TeenLogin} />
      <Route path="/teen/join" component={TeenOnboarding} />
      <Route path="/teen-join" component={TeenOnboarding} />

      {/* Teen dashboard route - always render if teen session exists */}
      <Route path="/teen-dashboard">
        {teenLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">Loading teen data...</div>
          </div>
        ) : (teenData && !teenError) ? (
          <TeenDashboard />
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-xl">Debug Info</h2>
              <div className="text-sm text-left bg-gray-100 p-4 rounded">
                <pre>{JSON.stringify({
                  teenData: !!teenData,
                  teenError: teenError?.message,
                  teenLoading,
                  condition: (teenData && !teenError),
                  rawData: teenData
                }, null, 2)}</pre>
              </div>
              <Login />
            </div>
          </div>
        )}
      </Route>
      
      {/* Teen-specific routes */}
      <Route path="/teen-tasks">
        {(teenData && !teenError) ? <TeenTasks /> : <Login />}
      </Route>
      <Route path="/teen-calendar">
        {(teenData && !teenError) ? <TeenCalendar /> : <Login />}
      </Route>
      <Route path="/teen-passwords">
        {(teenData && !teenError) ? <TeenPasswords /> : <Login />}
      </Route>
      
      {/* Other routes based on authentication */}
      {isTeenUser ? (
        <>
          <Route path="/" component={TeenDashboard} />
          <Route path="/profile" component={TeenProfile} />
          <Route component={NotFound} />
        </>
      ) : (
        // Parent/Admin routes - for authenticated users
        <>
          {!isAuthenticated ? (
            <Route path="/" component={Login} />
          ) : (
            <>
              <Route path="/" component={Dashboard} />
              <Route path="/settings" component={Settings} />
              <Route path="/calendar" component={Calendar} />
              <Route path="/tasks" component={Tasks} />
              <Route path="/meal-plan" component={MealPlan} />
            </>
          )}
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}