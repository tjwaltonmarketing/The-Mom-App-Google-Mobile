import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, User, Flag, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TaskModal } from "@/components/task-modal";
import type { Task, FamilyMember } from "@shared/schema";
import { format } from "date-fns";

export function AdvancedTaskManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, completedBy }: { taskId: number; completedBy: number }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}/complete`, { completedBy });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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

  // Filter and search tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    
    const matchesAssignee = filterAssignee === "all" || 
                           (filterAssignee === "unassigned" && !task.assignedTo) ||
                           task.assignedTo?.toString() === filterAssignee;
    
    const matchesCompletion = showCompleted || !task.isCompleted;

    return matchesSearch && matchesPriority && matchesAssignee && matchesCompletion;
  });

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.isCompleted).length,
    pending: tasks.filter(t => !t.isCompleted).length,
    high: tasks.filter(t => t.priority === 'high' && !t.isCompleted).length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Flag className="text-primary mr-2 h-5 w-5" />
            Advanced Task Management
          </CardTitle>
          <Button onClick={() => setIsTaskModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
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
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tasks match your filters</p>
            ) : (
              filteredTasks.map((task) => {
                const member = getMemberById(task.assignedTo);
                return (
                  <div 
                    key={task.id} 
                    className={`p-4 border rounded-lg transition-colors ${
                      task.isCompleted 
                        ? 'bg-gray-50 opacity-75 border-gray-200' 
                        : 'bg-white hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={task.isCompleted || false}
                        onCheckedChange={() => !task.isCompleted && handleCompleteTask(task.id)}
                        disabled={task.isCompleted || completeTaskMutation.isPending}
                        className="mt-1"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`font-medium ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority} priority
                            </Badge>
                            {member && (
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                                style={{ backgroundColor: member.color }}
                                title={member.name}
                              >
                                {member.avatar}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {task.description && (
                          <p className={`text-sm mb-2 ${task.isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-4">
                            {task.dueDate && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                              </div>
                            )}
                            <span>
                              {task.isCompleted 
                                ? `Completed by ${getMemberById(task.completedBy)?.name || 'Unknown'}`
                                : `Assigned to ${member?.name || 'Unassigned'}`
                              }
                            </span>
                          </div>
                          
                          <span>
                            Task #{task.id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
      />
    </Card>
  );
}