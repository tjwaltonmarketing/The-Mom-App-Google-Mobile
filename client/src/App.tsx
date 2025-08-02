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
  const { data: teenData, isLoading: teenLoading } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    retry: false,
    enabled: !isAuthenticated, // Only check for teen auth if not already authenticated as regular user
  });
  
  const isTeenUser = !!teenData && !isAuthenticated;

  // Debug authentication state
  console.log("Auth state:", { isAuthenticated, isLoading, hasUser: !!user, isTeenUser, teenData: !!teenData, teenLoading });

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

      {/* Teen routes - for teen users */}
      {isTeenUser ? (
        <>
          <Route path="/" component={TeenDashboard} />
          <Route path="/teen-dashboard" component={TeenDashboard} />
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