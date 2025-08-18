import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, User, Flag, Search, Filter, Trash2, AlertTriangle, UserPlus, Edit, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TaskModal } from "@/components/task-modal";
import { TaskEditModal } from "@/components/task-edit-modal";
import { TeenTaskAssignmentModal } from "@/components/teen-task-assignment-modal";
import type { Task, FamilyMember } from "@shared/schema";
import { format } from "date-fns";

export function AdvancedTaskManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { toast } = useToast();

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
    gcTime: 0,    // Don't cache in garbage collection
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

  // Find current user's family member ID
  const currentUserMember = familyMembers.find(member => 
    member.userId === currentUser?.id
  );

  // Separate tasks by owner/assignee
  const myTasks = tasks.filter(task => 
    task.assignedTo === currentUserMember?.id || 
    task.createdBy === currentUserMember?.id
  );

  const familyTasks = tasks.filter(task => 
    task.assignedTo !== currentUserMember?.id && 
    task.createdBy !== currentUserMember?.id
  );

  // Apply filters to both task lists
  const applyFilters = (tasksList: Task[]) => {
    return tasksList.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || 
                             (filterAssignee === 'unassigned' && !task.assignedTo) ||
                             (task.assignedTo && task.assignedTo.toString() === filterAssignee);
      const matchesCompletion = showCompleted || !task.isCompleted;
      
      return matchesSearch && matchesPriority && matchesAssignee && matchesCompletion;
    });
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

  // Filter function for tasks
  const filterTasks = (taskList: Task[]) => {
    return taskList.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
      
      const matchesAssignee = filterAssignee === "all" || 
                             (filterAssignee === "unassigned" && !task.assignedTo) ||
                             task.assignedTo?.toString() === filterAssignee;
      
      const matchesCompletion = showCompleted || !task.isCompleted;

      return matchesSearch && matchesPriority && matchesAssignee && matchesCompletion;
    });
  };

  const filteredMyTasks = filterTasks(myTasks);
  const filteredFamilyTasks = filterTasks(familyTasks);

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
              <TeenTaskAssignmentModal>
                <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden xs:inline">Assign to Teen</span>
                  <span className="xs:hidden">Assign</span>
                </Button>
              </TeenTaskAssignmentModal>
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

              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="w-40">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {familyMembers.map(member => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
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

          {/* Task List */}
          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner variant="heart" size="md" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* My Tasks Section */}
              {filteredMyTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    My Tasks ({filteredMyTasks.length})
                  </h3>
                  <div className="space-y-3">
                    {filteredMyTasks.map((task) => {
                      const member = getMemberById(task.assignedTo);
                      return (
                        <div key={task.id}>
                          {renderTaskItem(task, member)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Family Tasks Section */}
              {filteredFamilyTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-green-600" />
                    Family Tasks ({filteredFamilyTasks.length})
                  </h3>
                  <div className="space-y-3">
                    {filteredFamilyTasks.map((task) => {
                      const member = getMemberById(task.assignedTo);
                      return (
                        <div key={task.id}>
                          {renderTaskItem(task, member)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {filteredMyTasks.length === 0 && filteredFamilyTasks.length === 0 && (
                <p className="text-gray-500 text-center py-8">No tasks match your filters</p>
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