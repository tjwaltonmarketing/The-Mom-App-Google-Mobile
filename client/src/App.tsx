import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { LoadingProvider } from "@/components/ui/loading-provider";
import { PageLoadingHandler } from "@/components/ui/page-loading";
import { useNotifications } from "@/hooks/use-notifications";
import Dashboard from "@/pages/dashboard";
import CalendarPage from "@/pages/calendar";
import TasksPage from "@/pages/tasks";
import MealPlanPage from "@/pages/meal-plan";
import GroceryListPage from "@/pages/grocery-list";
import SubscriptionPage from "@/pages/subscription";
import AIAssistantPage from "@/pages/ai-assistant";
import SettingsPage from "@/pages/settings";
import TutorialsPage from "@/pages/tutorials";
import VoiceTestPage from "@/pages/voice-test";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/meal-plan" component={MealPlanPage} />
      <Route path="/grocery-list" component={GroceryListPage} />
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
