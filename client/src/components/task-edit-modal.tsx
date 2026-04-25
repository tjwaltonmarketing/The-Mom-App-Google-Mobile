import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, User, Flag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Task, FamilyMember } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskEditModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskEditModal({ task, isOpen, onClose }: TaskEditModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState<string>(task.priority);
  const [assignedTo, setAssignedTo] = useState<string>(task.assignedTo?.toString() || "unassigned");
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined
  );
  const [points, setPoints] = useState<string>(task.points?.toString() || "10");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const { toast } = useToast();

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  // Update form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setAssignedTo(task.assignedTo?.toString() || "unassigned");
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setPoints(task.points?.toString() || "10");
    }
  }, [task]);

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      return apiRequest("PATCH", `/api/tasks/${task.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"], refetchType: "all" });
      queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating task",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    const updates = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      assignedTo: assignedTo !== "unassigned" ? parseInt(assignedTo) : null,
      dueDate: dueDate ? dueDate.toISOString() : null,
      points: parseInt(points),
    };

    updateTaskMutation.mutate(updates);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Enter task description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1">
                  <Flag className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Assign To</label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-1">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {familyMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Points Reward</label>
              <Select value={points} onValueChange={setPoints}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 points</SelectItem>
                  <SelectItem value="10">10 points</SelectItem>
                  <SelectItem value="15">15 points</SelectItem>
                  <SelectItem value="20">20 points</SelectItem>
                  <SelectItem value="25">25 points</SelectItem>
                  <SelectItem value="30">30 points</SelectItem>
                  <SelectItem value="50">50 points</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <label className="text-sm font-medium">Due Date</label>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full mt-1 justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground"
                )}
                onClick={() => setDatePickerOpen(!datePickerOpen)}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP") : "Pick a date"}
              </Button>
              {datePickerOpen && (
                <div className="absolute z-50 top-full left-0 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-md shadow-lg">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date);
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={updateTaskMutation.isPending}
              className="flex-1"
            >
              {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}