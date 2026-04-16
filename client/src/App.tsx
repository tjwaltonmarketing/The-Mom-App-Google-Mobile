import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { SplashScreen } from "@/components/splash-screen";
import { ThemeProvider } from "@/components/theme-provider";
import { PullToRefreshIndicator } from "@/components/pull-to-refresh-indicator";
import { getApiUrl, setAuthToken } from "@/lib/config";

// Pages
import Welcome from "@/pages/welcome";
import Login from "@/pages/login";
import Register from "@/pages/register";
import FinishProfile from "@/pages/finish-profile";
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
import DeleteAccount from "@/pages/delete-account";

import TeenPasswords from "@/pages/teen-passwords";
import TeenProfile from "@/pages/teen-profile";
import MealPlan from "@/pages/meal-plan";
import GroceryList from "@/pages/grocery-list";
import Notes from "@/pages/notes";
import Tutorials from "@/pages/tutorials";
import VideoTutorials from "@/pages/video-tutorials";
import AIAssistant from "@/pages/ai-assistant";
import Upgrade from "@/pages/upgrade";
import UpgradeSuccess from "@/pages/upgrade-success";
import Subscription from "@/pages/subscription";
import Admin from "@/pages/admin";

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
  isOnTrial?: boolean;
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [splashCompleted, setSplashCompleted] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [wasAuthenticated, setWasAuthenticated] = useState(false);
  const [, setLocation] = useLocation();

  // Handle google_token query param (web/iOS flow), App Links return (/auth/google/return),
  // and clean up any stale state params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get("google_token");

    if (googleToken) {
      // Web/iOS: token delivered directly in URL.
      // Route to "/" and let App.tsx routing decide (returning users → dashboard,
      // new users with no subscription → needsFinishProfile → FinishProfile).
      setAuthToken(googleToken);
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      setLocation("/");
    } else if (window.location.pathname === "/auth/google/return") {
      // Android fallback: Chrome loaded this page instead of opening the native app.
      // Poll for the token, then try to push it back into the native app via intent URL.
      // If the intent fails, fall back to browser-based auth.
      const state = params.get("state");
      const alreadyProcessed = params.get("already_processed") === "true";
      if (state && !alreadyProcessed) {
        fetch(getApiUrl(`/api/auth/google/poll?state=${state}`), { credentials: "include" })
          .then(r => r.json())
          .then(data => {
            if (data.token) {
              localStorage.removeItem("google_oauth_state");
              // Attempt to reopen the native app and deliver the token via intent URL.
              // If the intent succeeds the native appUrlOpen listener will handle it.
              // The browser_fallback_url delivers the token in the URL so the web
              // googleToken handler (lines above) picks it up as a last resort.
              const encodedToken = encodeURIComponent(data.token);
              const fallbackUrl = encodeURIComponent(
                `https://app.themom.app/?google_token=${encodedToken}`
              );
              const intentUrl = `intent://app.themom.app/?google_token=${encodedToken}#Intent;scheme=https;package=com.momapp.family;S.browser_fallback_url=${fallbackUrl};end`;
              window.location.href = intentUrl;
              // Safety net: if still in browser after 1.5 s (intent URL was blocked),
              // set auth directly in the web context.
              setTimeout(() => {
                setAuthToken(data.token);
                queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
                window.history.replaceState({}, "", "/");
                setLocation("/");
              }, 1500);
            }
          })
          .catch(() => {});
      }
    } else if (params.get("error") === "google_auth_failed") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Listen for deep link opens on Android (e.g. intent URL from Google OAuth browser fallback).
  // Uses registerPlugin so we don't need the separate @capacitor/app package.
  useEffect(() => {
    import("@capacitor/core").then(({ registerPlugin, Capacitor }) => {
      if (!Capacitor.isNativePlatform()) return;
      interface AppPlugin {
        addListener(event: string, cb: (data: { url: string }) => void): Promise<{ remove: () => void }>;
      }
      const CapApp = registerPlugin<AppPlugin>("App");
      let listenerHandle: { remove: () => void } | null = null;
      CapApp.addListener("appUrlOpen", (event) => {
        try {
          const url = new URL(event.url);
          const googleToken = url.searchParams.get("google_token");
          if (googleToken) {
            localStorage.removeItem("google_oauth_state");
            setAuthToken(googleToken);
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
            setLocation("/");
          }
        } catch {}
      }).then(h => { listenerHandle = h; }).catch(() => {});
      return () => { listenerHandle?.remove(); };
    }).catch(() => {});
  }, [setLocation]);

  useEffect(() => {
    import("@/services/push-notifications").then(({ setupNotificationTapHandler }) => {
      setupNotificationTapHandler(setLocation);
    }).catch(() => {});
  }, [setLocation]);

  const [pushRequested, setPushRequested] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setWasAuthenticated(true);
    } else if (wasAuthenticated && !isLoading) {
      const timeout = setTimeout(() => {
        setWasAuthenticated(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, isLoading, wasAuthenticated]);

  useEffect(() => {
    const handleResume = async () => {
      // Check for pending Google OAuth state (Android redirect flow).
      // Retry for up to 15 seconds in case the OAuth/2FA flow is still completing.
      const pendingState = localStorage.getItem("google_oauth_state");
      if (pendingState) {
        for (let attempt = 0; attempt < 15; attempt++) {
          try {
            const response = await fetch(getApiUrl(`/api/auth/google/poll?state=${pendingState}`), {
              credentials: "include",
            });
            if (response.ok) {
              const data = await response.json();
              if (data.token) {
                localStorage.removeItem("google_oauth_state");
                setAuthToken(data.token);
                queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
                setLocation("/");
                return;
              }
            }
          } catch {}
          // Wait 1 second before next attempt
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teen/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('resume', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('resume', handleResume);
    };
  }, []);

  // Check subscription status for authenticated users
  const { data: subscriptionData, isLoading: subscriptionLoading, isFetching: subscriptionFetching, status: subscriptionStatus, refetch: refetchSubscription } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
    queryFn: async () => {
      console.log("Fetching subscription data...");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(getApiUrl("/api/subscription"), {
        credentials: "include",
        headers,
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
  // Also skip onboarding if user already completed it (localStorage fallback for mobile)
  const onboardingCompleted = typeof window !== 'undefined' && localStorage.getItem("onboarding_completed") === "true";
  const pendingShareClaim = typeof window !== 'undefined' && localStorage.getItem("pending_share_claim") === "true";
  // Also wait for user data before showing onboarding — otherwise if the subscription
  // query resolves first (user still loading), needsOnboarding fires before
  // needsFinishProfile gets a chance to evaluate, sending new Google Sign-In users
  // straight to payment instead of the phone-number step.
  const needsOnboarding = isAuthenticated && subscriptionReady && !!user && (!subscriptionData && !onboardingCompleted || pendingShareClaim);

  // Require phone number before onboarding (catches Google Sign-In users who skipped finish-profile)
  // Exception: existing subscribers are never blocked — they're already set up
  // Wait for subscriptionReady so we don't evaluate before subscription data has loaded
  const needsFinishProfile = isAuthenticated && subscriptionReady && !!user && !(user as any).phoneNumber && !subscriptionData;

  // Determine if user needs to upgrade (expired trial or cancelled subscription)
  const needsUpgrade = isAuthenticated && !subscriptionLoading && subscriptionData && (
    subscriptionData.subscriptionStatus === "expired" ||
    subscriptionData.subscriptionStatus === "cancelled" ||
    (subscriptionData.isOnTrial && subscriptionData.trialDaysLeft === 0)
  );

  // Only check teen auth if parent auth is not authenticated or loading
  const { data: teenData, isLoading: teenLoading, error: teenError } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    queryFn: async () => {
      console.log("Fetching teen auth data...");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(getApiUrl("/api/teen/auth/user"), {
        credentials: "include",
        method: "GET",
        headers,
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

  useEffect(() => {
    console.log('Push notification useEffect:', { isAuthenticated, isTeenUser, pushRequested });
    if ((isAuthenticated || isTeenUser) && !pushRequested) {
      setPushRequested(true);
      console.log('Push notification: scheduling auto-request in 3s');
      const timer = setTimeout(() => {
        console.log('Push notification: importing module...');
        import("@/services/push-notifications").then(({ autoRequestPushPermission }) => {
          console.log('Push notification: module loaded, calling autoRequestPushPermission');
          autoRequestPushPermission().then((result) => {
            console.log('Push notification: autoRequestPushPermission result =', result);
          }).catch((err) => {
            console.error('Push notification: autoRequestPushPermission error:', err);
          });
        }).catch((err) => {
          console.error('Push notification: module import error:', err);
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isTeenUser, pushRequested]);

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
      <Route path="/finish-profile" component={FinishProfile} />
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
      <Route path="/delete-account" component={DeleteAccount} />
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
          {!isAuthenticated && !wasAuthenticated ? (
            <Route path="/" component={Welcome} />
          ) : !isAuthenticated && wasAuthenticated ? (
            // Previously authenticated, auth is being re-verified (app resume)
            <Route path="/:rest*" component={() => (
              <div className="min-h-screen flex items-center justify-center bg-neutral">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Reconnecting...</p>
                </div>
              </div>
            )} />
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
          ) : needsFinishProfile ? (
            // Require phone number before proceeding (e.g. Google Sign-In users)
            <Route path="/" component={FinishProfile} />
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
              <Route path="/video-tutorials" component={VideoTutorials} />
              <Route path="/meal-plan" component={MealPlan} />
              <Route path="/grocery-list" component={GroceryList} />
              <Route path="/ai-assistant" component={AIAssistant} />
              <Route path="/subscription" component={Subscription} />
              <Route path="/admin" component={Admin} />
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
        <PullToRefreshIndicator />
        <Router />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}