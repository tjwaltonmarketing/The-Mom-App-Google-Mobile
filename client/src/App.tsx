import { useState, useEffect } from "react";
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
import Onboarding from "@/pages/onboarding";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import Calendar from "@/pages/calendar";
import Tasks from "@/pages/tasks";
import TeenLogin from "@/pages/teen-login";
import TeenOnboarding from "@/pages/teen-onboarding";
import TeenDashboard from "@/pages/teen-dashboard";
import TeenTasks from "@/pages/teen-tasks";
import TeenCalendar from "@/pages/teen-calendar";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";

import TeenPasswords from "@/pages/teen-passwords";
import TeenProfile from "@/pages/teen-profile";
import MealPlan from "@/pages/meal-plan";
import GroceryList from "@/pages/grocery-list";
import Notes from "@/pages/notes";
import Tutorials from "@/pages/tutorials";
import AIAssistant from "@/pages/ai-assistant";
import Upgrade from "@/pages/upgrade";
import UpgradeSuccess from "@/pages/upgrade-success";

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

interface SubscriptionData {
  id: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  trialDaysLeft?: number;
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [splashCompleted, setSplashCompleted] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Check subscription status for authenticated users
  const { data: subscriptionData, isLoading: subscriptionLoading, isFetching: subscriptionFetching, status: subscriptionStatus, refetch: refetchSubscription } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
    queryFn: async () => {
      console.log("Fetching subscription data...");
      const response = await fetch("/api/subscription", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Subscription response status:", response.status);
      if (response.status === 401) {
        console.log("Subscription: not authenticated, returning null");
        return null;
      }
      if (!response.ok) {
        const text = await response.text();
        console.log("Subscription error:", text);
        throw new Error(`${response.status}: ${text}`);
      }
      const data = await response.json();
      console.log("Subscription data:", data);
      return data;
    },
    enabled: isAuthenticated,
    retry: 2, // Retry a couple times in case of timing issues
    retryDelay: 500, // Wait 500ms between retries
    staleTime: 0, // Always refetch subscription data
  });

  // Wait for subscription query to complete before deciding on routing
  // subscriptionLoading is true during initial fetch, but we also check isFetching for refetches
  // Also check if query is pending (hasn't started yet) when enabled changes
  const subscriptionReady = isAuthenticated ? (subscriptionStatus === 'success' || subscriptionStatus === 'error') : true;
  
  // Determine if user needs onboarding (never had a subscription)
  // Only show onboarding if subscription query completed and returned no data
  const needsOnboarding = isAuthenticated && subscriptionReady && !subscriptionData;

  // Determine if user needs to upgrade (expired trial or cancelled subscription)
  const needsUpgrade = isAuthenticated && !subscriptionLoading && subscriptionData && (
    subscriptionData.subscriptionStatus === "expired" ||
    subscriptionData.subscriptionStatus === "cancelled" ||
    (subscriptionData.subscriptionPlan === "trial" && subscriptionData.trialDaysLeft === 0)
  );

  // Only check teen auth if parent auth is not authenticated or loading
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
    enabled: true, // Always check teen auth to handle session switching properly
    staleTime: 0, // Always refetch to ensure we get fresh session data
    gcTime: 0, // Don't cache teen auth data (v5 uses gcTime instead of cacheTime)
  });
  
  const isTeenUser = teenData?.isAuthenticated === true;

  // Debug authentication state
  console.log("Auth state:", { 
    isAuthenticated, 
    isLoading, 
    hasUser: !!user, 
    isTeenUser, 
    teenData: !!teenData, 
    teenLoading,
    teenError: teenError?.message,
    enabled: !isAuthenticated && !isLoading,
    rawTeenData: teenData,
    routeCondition: teenData && !teenError
  });

  // Show splash screen on initial load for a minimum duration
  if (!splashCompleted && initialLoad) {
    return (
      <SplashScreen 
        isLoading={isLoading || teenLoading || (isAuthenticated && subscriptionLoading)} 
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
      <Route path="/teen/invite" component={TeenLogin} />
      <Route path="/teen/join" component={TeenOnboarding} />
      <Route path="/teen-join" component={TeenOnboarding} />
      <Route path="/teen-onboarding" component={TeenOnboarding} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/upgrade" component={Upgrade} />
      <Route path="/upgrade/success" component={UpgradeSuccess} />

      {/* Teen dashboard route - only render if teen is authenticated */}
      <Route path="/teen-dashboard">
        {teenLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">Loading teen data...</div>
          </div>
        ) : teenData?.isAuthenticated ? (
          <TeenDashboard />
        ) : (
          <TeenLogin />
        )}
      </Route>
      
      {/* Teen-specific routes */}
      <Route path="/teen-tasks">
        {teenData?.isAuthenticated ? <TeenTasks /> : <TeenLogin />}
      </Route>
      <Route path="/teen-calendar">
        {teenData?.isAuthenticated ? <TeenCalendar /> : <TeenLogin />}
      </Route>
      <Route path="/teen-passwords">
        {teenData?.isAuthenticated ? <TeenPasswords /> : <TeenLogin />}
      </Route>

      {/* Teen Profile Route */}
      <Route path="/teen-profile">
        {teenData?.isAuthenticated ? <TeenProfile /> : <TeenLogin />}
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
          ) : !subscriptionReady ? (
            // Wait for subscription check to complete before routing
            <Route path="/" component={() => (
              <div className="min-h-screen flex items-center justify-center bg-neutral">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading...</p>
                </div>
              </div>
            )} />
          ) : needsOnboarding ? (
            // Show onboarding for users who never had a subscription
            <Route path="/" component={Onboarding} />
          ) : needsUpgrade ? (
            // Show upgrade page for users with expired trial or cancelled subscription
            <Route path="/" component={Upgrade} />
          ) : (
            <>
              <Route path="/" component={Dashboard} />
              <Route path="/settings" component={Settings} />
              <Route path="/calendar" component={Calendar} />
              <Route path="/tasks" component={Tasks} />
              <Route path="/notes" component={Notes} />
              <Route path="/tutorials" component={Tutorials} />
              <Route path="/meal-plan" component={MealPlan} />
              <Route path="/grocery-list" component={GroceryList} />
              <Route path="/ai-assistant" component={AIAssistant} />
            </>
          )}
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

export default function App() {
  // Add capacitor-app class to body when running as native app
  // This enables iOS safe area padding only for actual native apps, not web previews
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      document.body.classList.add('capacitor-app');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}