import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, FamilyMember } from "@shared/schema";

export function QuickTasks() {
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/pending"],
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
        return 'bg-warning text-gray-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCompleteTask = (taskId: number) => {
    // Assuming Mom (id: 1) is completing the task for demo purposes
    completeTaskMutation.mutate({ taskId, completedBy: 1 });
  };

  // Show only first 5 pending tasks
  const displayTasks = tasks.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center">
          <CheckCircle className="text-secondary mr-2 h-5 w-5" />
          Quick Tasks
        </CardTitle>
        <Button variant="link" className="text-primary hover:text-blue-600 text-sm font-medium p-0">
          <Plus className="mr-1 h-4 w-4" />
          Add Task
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {displayTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No pending tasks</p>
          ) : (
            displayTasks.map((task) => {
              const member = getMemberById(task.assignedTo);
              return (
                <div 
                  key={task.id} 
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    task.isCompleted 
                      ? 'bg-gray-50 opacity-75' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <Checkbox
                    checked={task.isCompleted}
                    onCheckedChange={() => !task.isCompleted && handleCompleteTask(task.id)}
                    disabled={task.isCompleted || completeTaskMutation.isPending}
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${task.isCompleted ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="secondary" 
                        className={getPriorityColor(task.priority)}
                      >
                        {task.isCompleted ? 'Completed' : `${task.priority} Priority`}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {task.isCompleted 
                          ? `Completed by ${getMemberById(task.completedBy)?.name || 'Unknown'}`
                          : `Assigned to ${member?.name || 'Unknown'}`
                        }
                      </span>
                    </div>
                  </div>
                  {member && (
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.avatar}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
