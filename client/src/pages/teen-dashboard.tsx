import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, authFetch } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { getUserTimezone } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TeenTaskDetailModal } from "@/components/teen-task-detail-modal";
import { TeenEventDetailModal } from "@/components/teen-event-detail-modal";
import { FamilyDishwasher } from "@/components/family-dishwasher";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Star, 
  Flame, 
  Trophy, 
  Plus,
  Users,
  Lock,
  ChefHat,
  Utensils
} from "lucide-react";
import TeenNavigation from "@/components/teen/teen-navigation";
import { NotificationPrompt } from "@/components/dashboard/notification-prompt";
import type { Task, Event } from "@shared/schema";

interface MealPlan {
  id: number;
  day: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  meal: string;
  ingredients?: string[];
  prepTime?: number;
  notes?: string;
  createdAt: string;
}

export default function TeenDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [, setLocation] = useLocation();

  // Get teen profile data with avatar
  const { data: authData, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    queryFn: async () => {
      const response = await authFetch("/api/teen/auth/user");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    retry: false,
  });

  // Extract teen profile from auth response
  const isAuthenticated = (authData as any)?.isAuthenticated;
  const teenProfile = isAuthenticated ? (authData as any).teenProfile : null;

  console.log("Teen Dashboard - Auth state:", { 
    isAuthenticated, 
    teenProfile: !!teenProfile, 
    authData: authData,
    enabled: isAuthenticated && !!teenProfile 
  });

  // Fetch weekly meal plans for teen dashboard
  const { data: weeklyMeals = [], isLoading: mealsLoading, error: mealsError } = useQuery<MealPlan[]>({
    queryKey: ["/api/teen/meal-plans/week"],
    queryFn: async () => {
      console.log("Teen Dashboard: Fetching weekly meal plans...");
      const response = await authFetch("/api/teen/meal-plans/week");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("Teen Dashboard: Weekly meals data:", data);
      return data;
    },
    retry: false,
    enabled: authData !== undefined, // Run query once we have auth state
  });
  

  // Fetch family info (name and member count)
  const { data: familyInfo } = useQuery<{ familyId: number; familyName: string; memberCount: number }>({
    queryKey: ["/api/teen/family-info"],
    queryFn: async () => {
      const response = await authFetch("/api/teen/family-info");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    retry: false,
    enabled: authData !== undefined,
  });

  // Fetch teen stats (points, streak) from the family member record
  const { data: teenStats } = useQuery({
    queryKey: ["/api/teen/stats"],
    queryFn: async () => {
      console.log("Dashboard: Fetching stats...");
      const response = await authFetch("/api/teen/stats");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("Dashboard: Teen stats:", data);
      return data;
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    enabled: authData !== undefined,
  });

  // Fetch teen's real tasks from API
  const { data: todayTasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ["/api/teen/tasks"],  
    queryFn: async () => {
      console.log("Dashboard: Fetching tasks...");
      const response = await authFetch("/api/teen/tasks");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("Dashboard: Tasks data:", data);
      return data;
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    enabled: authData !== undefined,
  });

  // Fetch teen's upcoming events from API
  const { data: upcomingEvents = [], isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ["/api/teen/events"],
    queryFn: async () => {
      console.log("Dashboard: Fetching events...");
      const response = await authFetch("/api/teen/events");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("Dashboard: Events data:", data);
      return data;
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    enabled: authData !== undefined,
  });


  const completedTasks = (todayTasks as any[]).filter((task: any) => task.isCompleted);
  const pendingTasks = (todayTasks as any[]).filter((task: any) => !task.isCompleted);
  const taskProgress = todayTasks.length > 0 ? (completedTasks.length / (todayTasks as any[]).length) * 100 : 0;

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Filter upcoming events to show events from today and future
  const futureEvents = (upcomingEvents as any[])
    .filter((event: any) => {
      const eventStartTime = new Date(event.startTime);
      const now = new Date();
      // Create today's date at midnight in local timezone
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // Get event date in local timezone 
      const eventDate = new Date(eventStartTime.getFullYear(), eventStartTime.getMonth(), eventStartTime.getDate());
      const isVisible = eventDate >= today;
      console.log(`Event "${event.title}" at ${event.startTime}: visible=${isVisible}, eventTime=${eventStartTime}, today=${today}`);
      return isVisible;
    })
    .sort((a: any, b: any) => {
      // Sort by start time chronologically (earliest first)
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  
  console.log(`Dashboard: Filtered ${futureEvents.length} future events from ${(upcomingEvents as any[]).length} total events`);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation Header */}
      <TeenNavigation currentPath="/teen-dashboard" teenProfile={teenProfile} />

      <div className="max-w-7xl mx-auto px-4 py-6 pb-28 lg:pb-6">
        {/* Personalized Greeting */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {getGreeting()}, {teenProfile?.firstName || 'there'}!
        </h1>

        <NotificationPrompt />

        {/* Weather Widget at Top */}
        <div className="mb-6">
          <WeatherWidget />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Points & Streak Card */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{(teenStats as any)?.totalPoints || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-lg font-semibold">{(teenStats as any)?.streak || 0}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Day Streak</p>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Today's Tasks</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{completedTasks.length}/{todayTasks.length}</span>
                </div>
                <Progress value={taskProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card className="md:col-span-1 lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Today's Tasks
                </CardTitle>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation("/teen/tasks")}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Task
                  </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="ml-2 text-sm text-gray-600">Loading tasks...</span>
                </div>
              ) : todayTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500 mb-2">No tasks assigned today</p>
                  <p className="text-xs text-gray-400">Check back later or ask your parents about new tasks!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayTasks.map((task: Task) => (
                    <div 
                      key={task.id} 
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        task.isCompleted 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => setEditingTask(task)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          task.isCompleted 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-300'
                        }`}>
                          {task.isCompleted && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <p className={`font-medium ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'outline'} className={task.priority !== 'high' ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600' : ''}>
                          {task.priority}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="text-sm font-medium">{task.points || 10}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="ml-2 text-sm text-gray-600">Loading events...</span>
                </div>
              ) : futureEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
              ) : (
                <div className="space-y-3">
                  {futureEvents.map((event) => {
                    const startTime = new Date(event.startTime);
                    const dateStr = startTime.toLocaleDateString('en-US', { 
                      timeZone: getUserTimezone(),
                      month: 'short', 
                      day: 'numeric' 
                    });
                    const timeStr = startTime.toLocaleTimeString('en-US', { 
                      timeZone: getUserTimezone(),
                      hour: 'numeric', 
                      minute: '2-digit', 
                      hour12: true
                    });
                    
                    return (
                      <div 
                        key={event.id} 
                        className="p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => setEditingEvent(event)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{event.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{dateStr} at {timeStr}</p>
                            {event.location && (
                              <p className="text-xs text-gray-500 mt-1">📍 {event.location}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {event.visibilityType || 'shared'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Family Connection */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Family
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Connected to</p>
                  <p className="font-semibold">{familyInfo?.familyName || "Your Family"}</p>
                  <p className="text-xs text-gray-500 mt-1">{familyInfo?.memberCount || 0} members</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setLocation("/teen-calendar")}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  View Family Calendar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Dinner Plans */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-green-500" />
                This Week's Dinners
                <Badge variant="outline" className="text-xs ml-auto bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600">
                  Set by parents
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mealsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="ml-2 text-sm text-gray-600">Loading meal plans...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                    const dayMeal = weeklyMeals.find((meal: MealPlan) => meal.day === day);
                    const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
                    
                    return (
                      <div 
                        key={day} 
                        className={`p-3 rounded-lg border ${
                          isToday 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 ring-2 ring-green-100 dark:ring-green-800/50' 
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-xs font-medium ${isToday ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                            {day}
                          </p>
                          {isToday && (
                            <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-300 dark:border-green-600 bg-white dark:bg-gray-800">
                              Today
                            </Badge>
                          )}
                        </div>
                        {dayMeal ? (
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                              {dayMeal.meal}
                            </p>
                            {dayMeal.notes && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                {dayMeal.notes}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                            No dinner planned
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Dishwasher Status Card - Full Width at Bottom */}
          <div className="md:col-span-2 lg:col-span-3">
            <FamilyDishwasher 
              apiEndpoint="/api/teen/household-settings" 
              updateEndpoint="/api/teen/household-settings/dishwasher"
              isTeenView={true}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {editingTask && (
        <TeenTaskDetailModal 
          task={editingTask}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
      
      {editingEvent && (
        <TeenEventDetailModal 
          event={editingEvent}
          isOpen={!!editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}