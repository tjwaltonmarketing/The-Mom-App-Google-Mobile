import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Clock, Target, CheckSquare, Filter, Calendar } from "lucide-react";
import TeenNavigation from "@/components/teen/teen-navigation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Task {
  id: number;
  title: string;
  description?: string;
  dueDate: Date | string;
  priority: "low" | "medium" | "high";
  status: string;
  points?: number;
  category?: string;
  estimatedTime?: number;
  isCompleted?: boolean;
}

const priorityColors = {
  low: "bg-green-50 border-green-200 text-green-700",
  medium: "bg-yellow-50 border-yellow-200 text-yellow-700", 
  high: "bg-red-50 border-red-200 text-red-700"
};

const categoryColors = {
  chores: "bg-blue-50 border-blue-200",
  homework: "bg-purple-50 border-purple-200",
  personal: "bg-pink-50 border-pink-200",
  family: "bg-green-50 border-green-200"
};

export default function TeenTasks() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
    category: "personal" as "personal" | "chores" | "homework" | "family",
    estimatedTime: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get teen profile data with avatar
  const { data: authData, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    retry: false,
  });

  // Extract teen profile from auth response
  const teenProfile = (authData as any)?.isAuthenticated ? (authData as any).teenProfile : null;

  // Fetch tasks from database
  const { data: tasks = [], isLoading, refetch } = useQuery<Task[]>({
    queryKey: ["/api/teen/tasks"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache the data
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await apiRequest("POST", "/api/teen/tasks", taskData);
    },
    onSuccess: () => {
      // Force refetch of tasks data
      console.log("Task created successfully, refetching tasks...");
      refetch().then(() => {
        console.log("Tasks refetched successfully");
      }).catch((error) => {
        console.error("Error refetching tasks:", error);
      });
      setIsAddTaskOpen(false);
      setNewTask({ title: "", description: "", dueDate: "", priority: "medium", category: "personal", estimatedTime: "" });
      toast({
        title: "Task Created",
        description: "Your task has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Task",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  // Toggle task completion
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: number; completed: boolean }) => {
      return await apiRequest("PUT", `/api/teen/tasks/${taskId}`, { completed });
    },
    onSuccess: () => {
      // Force refetch of tasks data
      queryClient.invalidateQueries({ queryKey: ["/api/teen/tasks"] });
      queryClient.refetchQueries({ queryKey: ["/api/teen/tasks"] });
      toast({
        title: "Task Updated",
        description: "Task status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Task",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Debug logging for tasks
  console.log("Current tasks:", tasks);
  console.log("Tasks loading state:", isLoading);

  // Filter and process tasks based on current filters
  const filteredTasks = tasks.filter((task: Task) => {
    const taskDate = new Date(task.dueDate);
    const today = new Date();
    const isToday = taskDate.toDateString() === today.toDateString();
    const isCompleted = task.isCompleted;
    
    // Apply date filter
    if (filter === 'today' && !isToday) return false;
    if (filter === 'completed' && !isCompleted) return false;
    if (filter === 'upcoming' && (isCompleted || taskDate <= today)) return false;
    
    // Apply priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    
    return true;
  });

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task: any) => task.status === 'completed' || task.isCompleted).length;
  const todayTasks = tasks.filter((task: any) => {
    const taskDate = new Date(task.dueDate);
    const today = new Date();
    return taskDate.toDateString() === today.toDateString();
  }).length;
  const pendingTasks = totalTasks - completedTasks;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    const taskData = {
      ...newTask,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : null,
      estimatedTime: newTask.estimatedTime ? parseInt(newTask.estimatedTime) : null,
      points: Math.floor(Math.random() * 20) + 5, // Random points for demo
    };

    createTaskMutation.mutate(taskData);
  };

  const handleToggleTask = (taskId: number, currentStatus: boolean) => {
    toggleTaskMutation.mutate({ taskId, completed: !currentStatus });
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "No due date";
    const today = new Date();
    const taskDate = new Date(date);
    
    if (taskDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (taskDate.toDateString() === new Date(today.getTime() + 86400000).toDateString()) {
      return "Tomorrow";
    } else {
      return taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <TeenNavigation currentPath="/teen-tasks" teenProfile={teenProfile} />
      
      <div className="max-w-6xl mx-auto p-4">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Tasks</h1>
            <p className="text-gray-600">Manage all your tasks and assignments</p>
          </div>
          <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Add details..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimatedTime">Time (mins)</Label>
                    <Input
                      id="estimatedTime"
                      type="number"
                      value={newTask.estimatedTime}
                      onChange={(e) => setNewTask({ ...newTask, estimatedTime: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value: "low" | "medium" | "high") => 
                        setNewTask({ ...newTask, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={newTask.category}
                      onValueChange={(value: "chores" | "homework" | "personal" | "family") => 
                        setNewTask({ ...newTask, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chores">Chores</SelectItem>
                        <SelectItem value="homework">Homework</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={createTaskMutation.isPending}>
                    {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddTaskOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="flex items-center">
                <CheckSquare className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{totalTasks}</p>
                  <p className="text-sm text-gray-600">Total Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{todayTasks}</p>
                  <p className="text-sm text-gray-600">Due Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{pendingTasks}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="flex items-center">
                <CheckSquare className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{completedTasks}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filter:</span>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="today">Due Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tasks List */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-600 mb-4">
                  {filter === "all" 
                    ? "You don't have any tasks yet. Create your first task to get started!"
                    : `No tasks match your current filter: ${filter}`
                  }
                </p>
                {filter !== "all" && (
                  <Button variant="outline" onClick={() => setFilter("all")}>
                    Show All Tasks
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task: any) => (
              <Card key={task.id} className={`hover:shadow-md transition-shadow ${
                task.status === 'completed' || task.isCompleted ? 'opacity-60' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <Checkbox
                        checked={task.status === 'completed' || task.isCompleted}
                        onCheckedChange={(checked) => handleToggleTask(task.id, task.isCompleted)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className={`font-semibold ${
                            task.status === 'completed' || task.isCompleted ? 'line-through text-gray-500' : ''
                          }`}>
                            {task.title}
                          </h3>
                          <Badge variant="outline" className={priorityColors[task.priority as keyof typeof priorityColors]}>
                            {task.priority}
                          </Badge>
                          {task.category && (
                            <Badge variant="outline" className={categoryColors[task.category as keyof typeof categoryColors]}>
                              {task.category}
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-gray-600 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(task.dueDate)}
                          </div>
                          {task.estimatedTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {task.estimatedTime} mins
                            </div>
                          )}
                          {task.points && (
                            <div className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {task.points} points
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}