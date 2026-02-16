import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CalendarDays, User, Flag, Lock, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/config";
import { useQueryClient } from "@tanstack/react-query";
import type { FamilyMember, InsertTask, Task } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { Link } from "wouter";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TaskModal({ isOpen, onClose }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [assignedTo, setAssignedTo] = useState<string>("unassigned");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState<string>("");
  const [points, setPoints] = useState<string>("0");
  const [isPrivate, setIsPrivate] = useState(false);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isIndividualPlan, canAssignTasks } = useSubscription();

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/family-members'), {
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

  const { data: childProfiles = [] } = useQuery<any[]>({
    queryKey: ["/api/child-profiles"],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/child-profiles'), {
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

  const createTaskMutation = useMutation({
    mutationFn: async (task: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", task);
      return response.json();
    },
    onSuccess: () => {
      // Explicit cache invalidation with refetch type for reliability
      queryClient.invalidateQueries({ 
        queryKey: ["/api/tasks"], 
        exact: true, 
        refetchType: "all" 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/tasks/pending"], 
        exact: true, 
        refetchType: "all" 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/dashboard/stats"], 
        exact: true, 
        refetchType: "all" 
      });
      
      toast({
        title: "Task Created",
        description: "Your task has been added successfully",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating task",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
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

    // Combine date and time if both are provided
    let finalDueDate: Date | null = null;
    if (dueDate) {
      if (dueTime) {
        const [hours, minutes] = dueTime.split(':').map(Number);
        finalDueDate = new Date(dueDate);
        finalDueDate.setHours(hours, minutes, 0, 0);
      } else {
        finalDueDate = new Date(dueDate);
        finalDueDate.setHours(9, 0, 0, 0); // Default to 9:00 AM if no time specified
      }
    }

    // Parse assignment value to determine if it's a family member or child profile
    let parsedAssignedTo = null;
    let childProfileId = null;
    
    if (assignedTo !== "unassigned") {
      if (assignedTo.startsWith("member-")) {
        parsedAssignedTo = parseInt(assignedTo.replace("member-", ""));
      } else if (assignedTo.startsWith("child-")) {
        childProfileId = parseInt(assignedTo.replace("child-", ""));
        // For child profiles, we don't set assignedTo since it's a different system
        parsedAssignedTo = null;
      }
    }

    const taskData: InsertTask = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      assignedTo: parsedAssignedTo,
      dueDate: finalDueDate ? finalDueDate.toISOString() : null,
      points: parseInt(points),
      isPrivate,
      // Add childProfileId if needed for backend processing
      ...(childProfileId && { childProfileId }),
    };

    createTaskMutation.mutate(taskData);
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignedTo("unassigned");
    setDueDate(undefined);
    setDueTime("");
    setPoints("0");
    setIsPrivate(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
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
              {isIndividualPlan ? (
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Crown className="h-4 w-4 text-pink-500" />
                    <span>Task assignment requires Family Plan</span>
                  </div>
                  <Link href="/plans">
                    <Button variant="link" size="sm" className="text-pink-500 p-0 h-auto mt-1">
                      Upgrade to assign tasks
                    </Button>
                  </Link>
                </div>
              ) : (
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="mt-1">
                    <User className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {familyMembers.map((member) => (
                      <SelectItem key={`member-${member.id}`} value={`member-${member.id}`}>
                        {member.name} ({member.role})
                      </SelectItem>
                    ))}
                    {childProfiles.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                          Child Accounts
                        </div>
                        {childProfiles.map((child) => (
                          <SelectItem key={`child-${child.id}`} value={`child-${child.id}`}>
                            {child.displayName} (Child Account)
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Points Reward</label>
            <Select value={points} onValueChange={setPoints}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None (No Points)</SelectItem>
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

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium">Private Task</label>
                <p className="text-xs text-muted-foreground">Only you can see this task</p>
              </div>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              data-testid="switch-private-task"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-1 justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium">Due Time</label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="mt-1"
                placeholder="Select time"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleClose} 
              variant="outline" 
              className="flex-1"
              disabled={createTaskMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1"
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}