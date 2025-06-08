import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { LoadingProvider } from "@/components/ui/loading-provider";
import { PageLoadingHandler } from "@/components/ui/page-loading";
import Dashboard from "@/pages/dashboard";
import CalendarPage from "@/pages/calendar";
import TasksPage from "@/pages/tasks";
import MealPlanPage from "@/pages/meal-plan";
import SubscriptionPage from "@/pages/subscription";
import AIAssistantPage from "@/pages/ai-assistant";
import SettingsPage from "@/pages/settings";
import TutorialsPage from "@/pages/tutorials";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <PageLoadingHandler />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/meal-plan" component={MealPlanPage} />
        <Route path="/subscription" component={SubscriptionPage} />
        <Route path="/ai-assistant" component={AIAssistantPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/tutorials" component={TutorialsPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LoadingProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LoadingProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
