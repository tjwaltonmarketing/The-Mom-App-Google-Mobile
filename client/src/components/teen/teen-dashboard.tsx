import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Calendar, Bell, Trophy, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TeenTask {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  assignedBy: string;
  points: number;
  isCompleted: boolean;
  reminderCount: number;
}

interface TeenEvent {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  type: "family" | "personal";
}

export function TeenDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery<TeenTask[]>({
    queryKey: ["/api/teen/tasks"],
  });

  const { data: todayEvents = [] } = useQuery<TeenEvent[]>({
    queryKey: ["/api/teen/events/today"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/teen/stats"],
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest("POST", `/api/teen/tasks/${taskId}/complete`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teen/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teen/stats"] });
      
      toast({
        title: "Task Completed! 🎉",
        description: `You earned ${data.pointsEarned} points! Great job!`,
      });
    },
  });

  const snoozeTaskMutation = useMutation({
    mutationFn: async ({ taskId, hours }: { taskId: number; hours: number }) => {
      const response = await apiRequest("POST", `/api/teen/tasks/${taskId}/snooze`, { hours });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teen/tasks"] });
      toast({
        title: "Task Snoozed",
        description: "I'll remind you again later",
      });
    },
  });

  const pendingTasks = tasks.filter(task => !task.isCompleted);
  const completedTasks = tasks.filter(task => task.isCompleted);
  const overdueTasks = pendingTasks.filter(task => new Date(task.dueDate) < new Date());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default: return "text-green-600 bg-green-50 border-green-200";
    }
  };

  const getTaskUrgency = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDue < 0) return { label: "Overdue", color: "text-red-600" };
    if (hoursUntilDue < 24) return { label: "Due today", color: "text-orange-600" };
    if (hoursUntilDue < 48) return { label: "Due tomorrow", color: "text-yellow-600" };
    return { label: "Due later", color: "text-gray-600" };
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Your Dashboard</h1>
        <p className="text-gray-600">Stay on top of your tasks and earn points!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasks Today</p>
                <p className="text-2xl font-bold">{pendingTasks.filter(t => new Date(t.dueDate).toDateString() === new Date().toDateString()).length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Points This Week</p>
                <p className="text-2xl font-bold">{stats?.weeklyPoints || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Streak</p>
                <p className="text-2xl font-bold">{stats?.streak || 0} days</p>
              </div>
              <Flame className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      {todayEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">
                    {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{event.title}</div>
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Urgent Tasks */}
      {overdueTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Bell className="h-5 w-5" />
              Urgent: Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueTasks.map((task) => (
                <div key={task.id} className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority} priority
                        </Badge>
                        <span className="text-xs text-red-600 font-medium">
                          Overdue since {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-yellow-600">+{task.points} pts</div>
                      {task.reminderCount > 0 && (
                        <div className="text-xs text-gray-500">
                          {task.reminderCount} reminder{task.reminderCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => completeTaskMutation.mutate(task.id)}
                      disabled={completeTaskMutation.isPending}
                      className="flex-1"
                    >
                      Mark Complete
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => snoozeTaskMutation.mutate({ taskId: task.id, hours: 2 })}
                      disabled={snoozeTaskMutation.isPending}
                    >
                      Snooze 2h
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regular Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Your Tasks
            </span>
            <Badge variant="outline">
              {completedTasks.length}/{tasks.length} complete
            </Badge>
          </CardTitle>
          {tasks.length > 0 && (
            <div>
              <Progress 
                value={(completedTasks.length / tasks.length) * 100} 
                className="h-2"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingTasks.filter(task => new Date(task.dueDate) >= new Date()).map((task) => {
              const urgency = getTaskUrgency(task.dueDate);
              return (
                <div key={task.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority} priority
                        </Badge>
                        <span className={`text-xs font-medium ${urgency.color}`}>
                          {urgency.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          Assigned by {task.assignedBy}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-yellow-600">+{task.points} pts</div>
                      <div className="text-xs text-gray-500">
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => completeTaskMutation.mutate(task.id)}
                      disabled={completeTaskMutation.isPending}
                      className="flex-1"
                    >
                      Complete Task
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => snoozeTaskMutation.mutate({ taskId: task.id, hours: 4 })}
                      disabled={snoozeTaskMutation.isPending}
                    >
                      Snooze
                    </Button>
                  </div>
                </div>
              );
            })}

            {pendingTasks.filter(task => new Date(task.dueDate) >= new Date()).length === 0 && (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">All caught up! 🎉</h3>
                <p className="text-gray-600">
                  No pending tasks. You're doing great!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-800">Recently Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="line-through text-gray-600">{task.title}</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">+{task.points} pts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}