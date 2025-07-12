import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Star, Clock, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Teen {
  id: number;
  name: string;
  avatar?: string;
  points: number;
  streak: number;
}

interface TeenTaskAssignmentModalProps {
  children: React.ReactNode;
}

export function TeenTaskAssignmentModal({ children }: TeenTaskAssignmentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeenId, setSelectedTeenId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("chores");
  const [points, setPoints] = useState(15);
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [dueDate, setDueDate] = useState("");
  
  const { toast } = useToast();

  const { data: teens = [], isLoading } = useQuery<Teen[]>({
    queryKey: ["/api/teens/available"],
    enabled: isOpen,
  });

  const assignTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return apiRequest("POST", "/api/tasks/assign-to-teen", {
        teenId: selectedTeenId,
        taskData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teen/tasks"] });
      toast({
        title: "Task Assigned!",
        description: `Successfully assigned "${title}" to the teen.`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign task to teen. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeenId) {
      toast({
        title: "Teen Selection Required",
        description: "Please select a teen to assign this task to.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for the task.",
        variant: "destructive",
      });
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
      points,
      estimatedTime,
      dueDate: dueDate ? new Date(dueDate) : null,
    };

    assignTaskMutation.mutate(taskData);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedTeenId(null);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategory("chores");
    setPoints(15);
    setEstimatedTime(30);
    setDueDate("");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'chores': return 'bg-blue-100 text-blue-800';
      case 'homework': return 'bg-purple-100 text-purple-800';
      case 'personal': return 'bg-green-100 text-green-800';
      case 'family': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Assign Task to Teen
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Teen Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Teen</Label>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : teens.length === 0 ? (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No teens available for task assignment.</p>
                <p className="text-sm text-gray-500 mt-1">Invite teens through Settings → Family.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teens.map((teen) => (
                  <div
                    key={teen.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTeenId === teen.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTeenId(teen.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                        {teen.avatar || teen.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{teen.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {teen.points} pts
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {teen.streak} streak
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Clean your room"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add specific instructions or details..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <Badge className={getPriorityColor('low')}>Low Priority</Badge>
                  </SelectItem>
                  <SelectItem value="medium">
                    <Badge className={getPriorityColor('medium')}>Medium Priority</Badge>
                  </SelectItem>
                  <SelectItem value="high">
                    <Badge className={getPriorityColor('high')}>High Priority</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chores">
                    <Badge className={getCategoryColor('chores')}>Chores</Badge>
                  </SelectItem>
                  <SelectItem value="homework">
                    <Badge className={getCategoryColor('homework')}>Homework</Badge>
                  </SelectItem>
                  <SelectItem value="personal">
                    <Badge className={getCategoryColor('personal')}>Personal</Badge>
                  </SelectItem>
                  <SelectItem value="family">
                    <Badge className={getCategoryColor('family')}>Family</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="points">Points Reward</Label>
              <Input
                id="points"
                type="number"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                min="1"
                max="50"
              />
            </div>

            <div>
              <Label htmlFor="estimatedTime">Estimated Time (minutes)</Label>
              <Input
                id="estimatedTime"
                type="number"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 0)}
                min="5"
                step="5"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="dueDate">Due Date (optional)</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={assignTaskMutation.isPending || !selectedTeenId}
              className="flex-1"
            >
              {assignTaskMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Task
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}