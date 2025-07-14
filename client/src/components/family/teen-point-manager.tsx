import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Star, Minus, RotateCcw, Clock, Trophy } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TeenPointsData {
  teenId: number;
  name: string;
  username: string;
  points: number;
  streak: number;
  lastActivity: string;
}

interface TeenPointManagerProps {
  teenId: number;
  teenName: string;
}

export function TeenPointManager({ teenId, teenName }: TeenPointManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeductDialog, setShowDeductDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [deductAmount, setDeductAmount] = useState("");
  const [deductReason, setDeductReason] = useState("");
  const [resetReason, setResetReason] = useState("");

  // Get teen points data
  const { data: teenPoints, isLoading, error } = useQuery<TeenPointsData>({
    queryKey: ["/api/teen/points", teenId],
    enabled: !!teenId,
    retry: 1,
  });

  // Deduct points mutation
  const deductMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
      const response = await apiRequest("POST", `/api/teen/points/${teenId}/deduct`, {
        amount,
        reason,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Points Deducted",
        description: `Deducted ${data.deducted} points from ${teenName}. New balance: ${data.newPoints}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teen/points", teenId] });
      setShowDeductDialog(false);
      setDeductAmount("");
      setDeductReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset points mutation
  const resetMutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      const response = await apiRequest("POST", `/api/teen/points/${teenId}/reset`, {
        reason,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Points Reset",
        description: `Reset ${teenName}'s points from ${data.previousPoints} to 0`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teen/points", teenId] });
      setShowResetDialog(false);
      setResetReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeduct = () => {
    const amount = parseInt(deductAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    deductMutation.mutate({ amount, reason: deductReason });
  };

  const handleReset = () => {
    resetMutation.mutate({ reason: resetReason });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {teenName} - Point Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!teenPoints) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {teenName} - Point Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            {error ? `Error loading teen data: ${error.message}` : "Teen not found or no points data available."}
          </p>
          {error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              Please ensure you're logged in as a parent to manage teen points.
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {teenPoints.name} - Point Management
          </CardTitle>
          <CardDescription>
            Manage reward points for @{teenPoints.username}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Star className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {teenPoints.points}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Points</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Trophy className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {teenPoints.streak}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Clock className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                Active
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Today</div>
            </div>
          </div>

          {/* Point Management Actions */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Reward Management</h4>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeductDialog(true)}
                className="flex items-center gap-2"
                disabled={teenPoints.points === 0}
              >
                <Minus className="h-4 w-4" />
                Deduct Points
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                className="flex items-center gap-2"
                disabled={teenPoints.points === 0}
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Zero
              </Button>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              Use these controls when {teenPoints.name.split(' ')[0]} redeems points for rewards like screen time, treats, or special privileges.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deduct Points Dialog */}
      <Dialog open={showDeductDialog} onOpenChange={setShowDeductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deduct Points from {teenPoints.name}</DialogTitle>
            <DialogDescription>
              Remove points when {teenPoints.name.split(' ')[0]} redeems them for a reward.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="deduct-amount">Points to Deduct</Label>
              <Input
                id="deduct-amount"
                type="number"
                min="1"
                max={teenPoints.points}
                value={deductAmount}
                onChange={(e) => setDeductAmount(e.target.value)}
                placeholder="Enter number of points"
              />
              <div className="text-sm text-gray-500 mt-1">
                Current balance: {teenPoints.points} points
              </div>
            </div>

            <div>
              <Label htmlFor="deduct-reason">Reason (Optional)</Label>
              <Textarea
                id="deduct-reason"
                value={deductReason}
                onChange={(e) => setDeductReason(e.target.value)}
                placeholder="e.g., Redeemed for extra screen time, movie night, etc."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeductDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeduct}
              disabled={deductMutation.isPending || !deductAmount}
            >
              {deductMutation.isPending ? "Deducting..." : "Deduct Points"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Points Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset {teenPoints.name}'s Points</DialogTitle>
            <DialogDescription>
              This will reset all {teenPoints.points} points to zero. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reset-reason">Reason (Optional)</Label>
              <Textarea
                id="reset-reason"
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="e.g., End of month reset, major reward redeemed, etc."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReset}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? "Resetting..." : "Reset to Zero"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}