import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RefreshCw, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/config";
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
import type { Task, Event } from "@shared/schema";

export function FreshStart() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/tasks'), {
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

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/events'), {
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

  const freshStartMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/fresh-start");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      toast({
        title: "Fresh Start Complete!",
        description: "All your trial data has been cleared. You can now start fresh with your own family data.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear all data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTasksMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/tasks");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Tasks Cleared",
        description: "All tasks have been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear tasks. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEventsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/events");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Events Cleared",
        description: "All events have been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear events. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFreshStart = () => {
    freshStartMutation.mutate();
  };

  const totalItems = tasks.length + events.length;
  const hasData = totalItems > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <CheckCircle className="text-green-600 mr-2 h-5 w-5" />
            Fresh Start Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            You're all set! No trial data found. You can now start adding your own family events and tasks.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <RefreshCw className="text-orange-600 mr-2 h-5 w-5" />
          Fresh Start
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-orange-600 h-5 w-5 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700 mb-2">
                Your trial account contains dummy data to help you explore the app. 
                When you're ready to start fresh with your own family data, use the options below.
              </p>
              <div className="text-sm text-gray-600">
                <p><strong>Current data:</strong> {tasks.length} tasks, {events.length} events</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => deleteTasksMutation.mutate()}
              disabled={deleteTasksMutation.isPending || tasks.length === 0}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Tasks ({tasks.length})
            </Button>

            <Button
              onClick={() => deleteEventsMutation.mutate()}
              disabled={deleteEventsMutation.isPending || events.length === 0}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Events ({events.length})
            </Button>

            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center">
                    <AlertTriangle className="text-orange-600 h-5 w-5 mr-2" />
                    Fresh Start - Clear All Data
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your trial data including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>{tasks.length} tasks</li>
                      <li>{events.length} events</li>
                    </ul>
                    <p className="mt-2 font-medium">
                      This action cannot be undone. Are you sure you want to start fresh?
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleFreshStart}
                    disabled={freshStartMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {freshStartMutation.isPending ? "Clearing..." : "Start Fresh"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}