import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Star, CheckCircle2, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@shared/schema";

interface TeenTaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export function TeenTaskDetailModal({ task, isOpen, onClose }: TeenTaskDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/teen/tasks/${task.id}`, { completed: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teen/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teen/stats"] });
      toast({
        title: "Task completed!",
        description: `Great job! You earned ${task.points} points.`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error completing task",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

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

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
            Task Details
          </DialogTitle>
          <DialogDescription>
            View task information and mark as complete when finished
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Task Title */}
          <div>
            <h3 className={`text-lg font-semibold ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
              {task.title}
            </h3>
            {task.isCompleted && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Completed!</span>
              </div>
            )}
          </div>

          {/* Task Description */}
          {task.description && (
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <p className="text-sm text-gray-600 mt-1 p-3 bg-gray-50 rounded-lg">
                {task.description}
              </p>
            </div>
          )}

          {/* Task Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="text-sm font-medium text-gray-700">Priority</label>
              <div className="mt-1">
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Points */}
            <div>
              <label className="text-sm font-medium text-gray-700">Points</label>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold text-yellow-600">{task.points}</span>
              </div>
            </div>

            {/* Due Date */}
            {task.dueDate && (
              <div>
                <label className="text-sm font-medium text-gray-700">Due Date</label>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {formatDueDate(task.dueDate)}
                  </span>
                </div>
              </div>
            )}

            {/* Assigned By */}
            <div>
              <label className="text-sm font-medium text-gray-700">Assigned By</label>
              <div className="flex items-center gap-1 mt-1">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Parents</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            
            {!task.isCompleted && (
              <Button 
                onClick={() => completeTaskMutation.mutate()}
                disabled={completeTaskMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {completeTaskMutation.isPending ? (
                  "Completing..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}