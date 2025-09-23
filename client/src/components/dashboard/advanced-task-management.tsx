import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, User, Flag, Search, Filter, Trash2, AlertTriangle, Edit, Users, ChevronDown, ChevronRight, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { TaskModal } from "@/components/task-modal";
import { TaskEditModal } from "@/components/task-edit-modal";
import type { Task, FamilyMember } from "@shared/schema";
import { format } from "date-fns";

export function AdvancedTaskManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await fetch('/api/tasks', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 0, // Always consider data stale
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
    queryFn: async () => {
      const response = await fetch('/api/family-members', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }
  });

  // Get current user to separate tasks
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }
  });

  // Group tasks by family member
  const groupTasksByMember = () => {
    const groups: Record<string, Task[]> = {};
    
    // Create groups for each family member
    familyMembers.forEach(member => {
      groups[`member-${member.id}`] = [];
    });
    
    // Add unassigned group
    groups['unassigned'] = [];
    
    // Group tasks
    tasks.forEach(task => {
      if (task.assignedTo) {
        const groupKey = `member-${task.assignedTo}`;
        if (groups[groupKey]) {
          groups[groupKey].push(task);
        }
      } else {
        groups['unassigned'].push(task);
      }
    });
    
    return groups;
  };

  const taskGroups = groupTasksByMember();

  // Apply filters to tasks
  const applyFilters = (tasksList: Task[]) => {
    return tasksList.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesCompletion = showCompleted || !task.isCompleted;
      
      return matchesSearch && matchesPriority && matchesCompletion;
    });
  };

  // Toggle collapse state for sections
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };



  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, completedBy }: { taskId: number; completedBy: number }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}/complete`, { completedBy });
    },
    onSuccess: () => {
      // Use the same simple pattern as teen tasks
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onMutate: async (taskId) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/tasks"] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(["/api/tasks"]);
      
      // Optimistically update to remove the task
      queryClient.setQueryData<Task[]>(["/api/tasks"], (old) => 
        old?.filter(task => task.id !== taskId) ?? []
      );
      
      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onError: (err, taskId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(["/api/tasks"], context?.previousTasks);
      toast({
        title: "Error",
        description: "Failed to delete the task. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Use the same simple pattern as teen tasks
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Task Deleted",
        description: "The task has been successfully deleted.",
      });
    },
  });

  const deleteAllTasksMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/tasks");
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/tasks"] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(["/api/tasks"]);
      
      // Optimistically update to clear all tasks
      queryClient.setQueryData<Task[]>(["/api/tasks"], []);
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Roll back on error
      queryClient.setQueryData(["/api/tasks"], context?.previousTasks);
      toast({
        title: "Error",
        description: "Failed to delete all tasks. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Enhanced cache clearing for bulk deletion
      queryClient.removeQueries({ queryKey: ["/api/tasks"] });
      queryClient.removeQueries({ queryKey: ["/api/tasks/pending"] });
      queryClient.removeQueries({ queryKey: ["/api/dashboard/stats"] });
      
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending"] });
      
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
      queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.refetchQueries({ queryKey: ["/api/tasks/pending"] });
      
      toast({
        title: "All Tasks Deleted",
        description: "All tasks have been successfully deleted. You now have a fresh start!",
      });
    },
  });

  const getMemberById = (id: number | null) => {
    return familyMembers.find(member => member.id === id);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCompleteTask = (taskId: number) => {
    completeTaskMutation.mutate({ taskId, completedBy: 1 });
  };

  const handleDeleteTask = (taskId: number) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleDeleteAllTasks = () => {
    deleteAllTasksMutation.mutate();
  };

  // Task item renderer
  const renderTaskItem = (task: Task, member: FamilyMember | undefined) => (
    <div 
      className={`p-3 border rounded-lg transition-colors overflow-hidden ${
        task.isCompleted 
          ? 'bg-gray-50 opacity-75 border-gray-200' 
          : 'bg-white hover:bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.isCompleted || false}
          onCheckedChange={() => !task.isCompleted && handleCompleteTask(task.id)}
          disabled={task.isCompleted || completeTaskMutation.isPending}
          className="mt-1 flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Title and main actions row */}
          <div className="flex items-start gap-2 mb-2">
            <h4 className={`font-medium text-sm flex-1 min-w-0 truncate ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {task.title}
            </h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                onClick={() => setEditingTask(task)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{task.title}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deleteTaskMutation.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteTaskMutation.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
              {task.priority} priority
            </Badge>
            {task.points && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                {task.points} points
              </Badge>
            )}
            {member && (
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: member.color }}
                title={member.name}
              >
                {member.avatar}
              </div>
            )}
          </div>
          
          {task.description && (
            <p className={`text-xs mb-2 ${task.isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
              {task.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4 flex-wrap">
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')} at {format(new Date(task.dueDate), 'h:mm a')}
                  </span>
                </div>
              )}
              <span>
                {task.isCompleted 
                  ? `Completed by ${getMemberById(task.completedBy)?.name || 'Unknown'}`
                  : `Assigned to ${member?.name || 'Unassigned'}`
                }
              </span>
            </div>
            
            <span className="flex-shrink-0">
              Task #{task.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Print task list for a family member
  const printTaskList = (memberId: number) => {
    const member = familyMembers.find(m => m.id === memberId);
    const memberTasks = applyFilters(taskGroups[`member-${memberId}`] || []);
    
    if (!member) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Check if this is for a parent (use simple checklist) or child (use gamified design)
    const isParent = member.role === 'parent' || member.role === 'mom' || member.role === 'dad';

    const printHTML = isParent ? `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${member.name}'s Task List</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              background: white;
              color: #333;
            }
            .container { 
              max-width: 600px;
              margin: 0 auto;
            }
            h1 { 
              color: #333; 
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .task { 
              display: flex; 
              align-items: flex-start; 
              padding: 12px 0; 
              border-bottom: 1px solid #eee;
            }
            .checkbox { 
              width: 16px; 
              height: 16px; 
              margin-right: 12px;
              margin-top: 2px;
              border: 2px solid #333;
              flex-shrink: 0;
            }
            .task-content { 
              flex-grow: 1;
            }
            .task-title { 
              font-weight: 600;
              margin-bottom: 4px;
            }
            .task-description {
              color: #666;
              font-size: 0.9em;
              margin-bottom: 4px;
            }
            .task-meta {
              font-size: 0.85em;
              color: #888;
            }
            .priority-high .task-title { color: #d32f2f; }
            .priority-medium .task-title { color: #f57c00; }
            .priority-low .task-title { color: #388e3c; }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              text-align: center;
              color: #666;
              font-size: 0.9em;
            }
            @media print {
              body { background: white !important; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${member.name}'s Task List</h1>
            ${memberTasks.map(task => `
              <div class="task priority-${task.priority}">
                <div class="checkbox"></div>
                <div class="task-content">
                  <div class="task-title">${task.title}</div>
                  ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                  <div class="task-meta">Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</div>
                </div>
              </div>
            `).join('')}
            <div class="footer">
              Printed on ${new Date().toLocaleDateString()}
            </div>
          </div>
        </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${member.name}'s Task List</title>
          <style>
            body { 
              font-family: 'Comic Sans MS', cursive, sans-serif; 
              padding: 20px; 
              background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57);
              min-height: 100vh;
            }
            .container { 
              background: white; 
              padding: 30px; 
              border-radius: 20px; 
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              max-width: 600px;
              margin: 0 auto;
            }
            h1 { 
              color: #2c3e50; 
              text-align: center; 
              font-size: 2.5em;
              margin-bottom: 10px;
            }
            .subtitle {
              text-align: center;
              color: #7f8c8d;
              font-size: 1.2em;
              margin-bottom: 30px;
            }
            .task { 
              display: flex; 
              align-items: center; 
              padding: 15px; 
              margin: 10px 0; 
              border: 3px dashed #3498db;
              border-radius: 15px;
              background: #f8f9fa;
            }
            .checkbox { 
              width: 30px; 
              height: 30px; 
              margin-right: 15px;
              border: 3px solid #3498db;
              border-radius: 8px;
            }
            .task-title { 
              font-size: 1.3em; 
              font-weight: bold;
              color: #2c3e50;
            }
            .priority-high { border-color: #e74c3c; background: #ffebee; }
            .priority-medium { border-color: #f39c12; background: #fff8e1; }
            .priority-low { border-color: #27ae60; background: #e8f5e8; }
            .points { 
              background: #9b59b6; 
              color: white; 
              padding: 5px 12px; 
              border-radius: 20px; 
              font-size: 0.9em;
              margin-left: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #7f8c8d;
              font-size: 1.1em;
            }
            @media print {
              body { background: white !important; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎯 ${member.name}'s Tasks</h1>
            <div class="subtitle">⭐ Complete each task and check it off! ⭐</div>
            ${memberTasks.map(task => `
              <div class="task priority-${task.priority}">
                <div class="checkbox"></div>
                <div>
                  <div class="task-title">${task.title}</div>
                  ${task.description ? `<div style="color: #7f8c8d; margin-top: 5px;">${task.description}</div>` : ''}
                </div>
                ${task.points ? `<div class="points">⭐ ${task.points} points</div>` : ''}
              </div>
            `).join('')}
            <div class="footer">
              🏆 Great job completing your tasks! 🏆<br>
              📅 Printed on ${new Date().toLocaleDateString()}
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.isCompleted).length,
    pending: tasks.filter(t => !t.isCompleted).length,
    high: tasks.filter(t => t.priority === 'high' && !t.isCompleted).length,
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Flag className="text-primary mr-2 h-5 w-5" />
              Advanced Task Management
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setIsTaskModalOpen(true)} className="gap-2 flex-1 sm:flex-none">
                <Plus className="h-4 w-4" />
                <span className="hidden xs:inline">Add Task</span>
                <span className="xs:hidden">Add</span>
              </Button>
              {tasks.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2 flex-1 sm:flex-none">
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden xs:inline">Clear All</span>
                      <span className="xs:hidden">Clear</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Tasks</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete all tasks? This will permanently remove all {tasks.length} tasks including completed ones. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAllTasks}
                        disabled={deleteAllTasksMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteAllTasksMutation.isPending ? "Deleting..." : "Delete All Tasks"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{taskStats.total}</div>
              <div className="text-xs text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
              <div className="text-xs text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{taskStats.pending}</div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{taskStats.high}</div>
              <div className="text-xs text-gray-600">High Priority</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showCompleted"
                checked={showCompleted}
                onCheckedChange={(checked) => setShowCompleted(checked === true)}
              />
              <label htmlFor="showCompleted" className="text-sm font-medium">
                Show completed tasks
              </label>
            </div>
          </div>

          {/* Task List by Family Member */}
          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner variant="heart" size="md" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Family Member Sections */}
              {familyMembers.map((member) => {
                const memberTasks = applyFilters(taskGroups[`member-${member.id}`] || []);
                const sectionKey = `member-${member.id}`;
                const isCollapsed = collapsedSections[sectionKey];
                
                if (memberTasks.length === 0) return null;
                
                return (
                  <Collapsible key={member.id} open={!isCollapsed} onOpenChange={() => toggleSection(sectionKey)}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors" data-testid={`section-${member.name.toLowerCase()}-tasks`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                style={{ backgroundColor: member.color }}
                              >
                                {member.avatar}
                              </div>
                              <div>
                                <CardTitle className="text-lg">
                                  {member.name}'s Tasks
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                  {memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  printTaskList(member.id);
                                }}
                                data-testid={`button-print-${member.name.toLowerCase()}-tasks`}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-3">
                          {memberTasks.map((task) => (
                            <div key={task.id}>
                              {renderTaskItem(task, member)}
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}

              {/* Unassigned Tasks Section */}
              {(() => {
                const unassignedTasks = applyFilters(taskGroups['unassigned'] || []);
                const sectionKey = 'unassigned';
                const isCollapsed = collapsedSections[sectionKey];
                
                if (unassignedTasks.length === 0) return null;
                
                return (
                  <Collapsible key="unassigned" open={!isCollapsed} onOpenChange={() => toggleSection(sectionKey)}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors" data-testid="section-unassigned-tasks">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm">
                                ?
                              </div>
                              <div>
                                <CardTitle className="text-lg">Unassigned Tasks</CardTitle>
                                <p className="text-sm text-gray-600">
                                  {unassignedTasks.length} task{unassignedTasks.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-3">
                          {unassignedTasks.map((task) => (
                            <div key={task.id}>
                              {renderTaskItem(task, undefined)}
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })()}

              {/* No Tasks Message */}
              {familyMembers.every(member => 
                applyFilters(taskGroups[`member-${member.id}`] || []).length === 0
              ) && applyFilters(taskGroups['unassigned'] || []).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Flag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No tasks found</p>
                  <p className="text-sm">Try adjusting your filters or create a new task.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {isTaskModalOpen && (
        <TaskModal 
          isOpen={isTaskModalOpen} 
          onClose={() => setIsTaskModalOpen(false)}
        />
      )}
      
      {editingTask && (
        <TaskEditModal 
          task={editingTask}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  );
}