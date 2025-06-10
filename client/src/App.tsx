import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { LoadingProvider } from "@/components/ui/loading-provider";
import { PageLoadingHandler } from "@/components/ui/page-loading";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import CalendarPage from "@/pages/calendar";
import TasksPage from "@/pages/tasks";
import MealPlanPage from "@/pages/meal-plan";
import GroceryListPage from "@/pages/grocery-list";
import FamilyChatPage from "@/pages/family-chat";
import SubscriptionPage from "@/pages/subscription";
import AIAssistantPage from "@/pages/ai-assistant";
import SettingsPage from "@/pages/settings";
import TutorialsPage from "@/pages/tutorials";
import VoiceTestPage from "@/pages/voice-test";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/meal-plan" component={MealPlanPage} />
      <Route path="/grocery-list" component={GroceryListPage} />
      <Route path="/family-chat" component={FamilyChatPage} />
      <Route path="/subscription" component={SubscriptionPage} />
      <Route path="/ai-assistant" component={AIAssistantPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/tutorials" component={TutorialsPage} />
      <Route path="/voice-test" component={VoiceTestPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function NotificationWrapper() {
  useNotifications(); // Initialize notification system
  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LoadingProvider>
          <TooltipProvider>
            <Toaster />
            <NotificationWrapper />
          </TooltipProvider>
        </LoadingProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
