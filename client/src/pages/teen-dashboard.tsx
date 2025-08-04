import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TeenTaskDetailModal } from "@/components/teen-task-detail-modal";
import { TeenEventDetailModal } from "@/components/teen-event-detail-modal";
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
import type { Task, Event } from "@shared/schema";

export default function TeenDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [, setLocation] = useLocation();

  // Fetch weekly meal plans for teen dashboard
  const { data: weeklyMeals = [], isLoading: mealsLoading } = useQuery({
    queryKey: ["/api/meal-plans/week"],
    retry: false,
  });

  // Get teen profile data with avatar
  const { data: authData, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    retry: false,
  });

  // Extract teen profile from auth response
  const teenProfile = (authData as any)?.isAuthenticated ? (authData as any).teenProfile : null;

  // Fetch teen's real tasks from API
  const { data: todayTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/teen/tasks"],  
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the data (v5 uses gcTime instead of cacheTime)
    enabled: !!teenProfile, // Only run query if teen is authenticated
  });

  // Fetch teen's upcoming events from API
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/teen/events"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the data
    enabled: !!teenProfile, // Only run query if teen is authenticated
  });

  const achievements = [
    { name: "Week Warrior", description: "7 days streak!", icon: "🔥" },
    { name: "Task Master", description: "100 tasks completed", icon: "⭐" },
    { name: "Early Bird", description: "5 morning tasks", icon: "🌅" }
  ];

  const completedTasks = (todayTasks as any[]).filter((task: any) => task.isCompleted);
  const pendingTasks = (todayTasks as any[]).filter((task: any) => !task.isCompleted);
  const taskProgress = todayTasks.length > 0 ? (completedTasks.length / (todayTasks as any[]).length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <TeenNavigation currentPath="/teen-dashboard" teenProfile={teenProfile} />

      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
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
                  <p className="text-2xl font-bold text-purple-600">{teenProfile?.points || 0}</p>
                  <p className="text-sm text-gray-600">Total Points</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-lg font-semibold">{teenProfile?.streak || 0}</span>
                  </div>
                  <p className="text-sm text-gray-600">Day Streak</p>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Today's Tasks</span>
                  <span className="text-sm text-gray-600">{completedTasks.length}/{todayTasks.length}</span>
                </div>
                <Progress value={taskProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card className="md:col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Today's Tasks
              </CardTitle>
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
                  {todayTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${
                        task.isCompleted 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-gray-200'
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
                              {task.dueDate ? new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No deadline'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
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
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => setEditingEvent(event)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{event.date} at {event.time}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
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
                  <p className="font-semibold">The Walton Family</p>
                  <p className="text-xs text-gray-500 mt-1">3 members</p>
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

          {/* Recent Achievements */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {achievements.map((achievement, index) => (
                  <div key={index} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                    <div className="text-2xl mb-2">{achievement.icon}</div>
                    <p className="font-medium text-sm">{achievement.name}</p>
                    <p className="text-xs text-gray-600">{achievement.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Dinner Plans */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-green-500" />
                This Week's Dinners
                <Badge variant="secondary" className="text-xs ml-auto">
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
                    const dayMeal = weeklyMeals.find(meal => meal.day === day);
                    const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
                    
                    return (
                      <div 
                        key={day} 
                        className={`p-3 rounded-lg border ${
                          isToday 
                            ? 'bg-green-50 border-green-200 ring-2 ring-green-100' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-xs font-medium ${isToday ? 'text-green-700' : 'text-gray-600'}`}>
                            {day}
                          </p>
                          {isToday && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                              Today
                            </Badge>
                          )}
                        </div>
                        {dayMeal ? (
                          <div>
                            <p className="font-medium text-sm text-gray-900 mb-1">
                              {dayMeal.meal}
                            </p>
                            {dayMeal.notes && (
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {dayMeal.notes}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
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