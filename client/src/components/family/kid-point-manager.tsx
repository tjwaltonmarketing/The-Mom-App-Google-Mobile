import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Minus, RotateCcw, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type FamilyMember } from "@shared/schema";

export function KidPointManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedKid, setSelectedKid] = useState<FamilyMember | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeductDialog, setShowDeductDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [amount, setAmount] = useState("");

  // Use family-members query and filter for kids - this works reliably with auth
  const { data: familyMembers = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
  });
  
  // Filter to only children and teens for point management
  const kids = familyMembers.filter(m => m.role === 'child' || m.role === 'teen');

  const addMutation = useMutation({
    mutationFn: async ({ kidId, amount }: { kidId: number; amount: number }) => {
      const response = await apiRequest("POST", `/api/family-points/${kidId}/add`, { amount });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Points Added", description: `Added ${amount} points to ${selectedKid?.name}` });
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      closeDialogs();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deductMutation = useMutation({
    mutationFn: async ({ kidId, amount }: { kidId: number; amount: number }) => {
      const response = await apiRequest("POST", `/api/family-points/${kidId}/deduct`, { amount });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Points Deducted", description: `Deducted ${amount} points from ${selectedKid?.name}` });
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      closeDialogs();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async ({ kidId }: { kidId: number }) => {
      const response = await apiRequest("POST", `/api/family-points/${kidId}/reset`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Points Reset", 
        description: `Reset ${selectedKid?.name}'s points from ${data.previousPoints} to 0` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      closeDialogs();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const closeDialogs = () => {
    setShowAddDialog(false);
    setShowDeductDialog(false);
    setShowResetDialog(false);
    setSelectedKid(null);
    setAmount("");
  };

  const handleAdd = () => {
    const pts = parseInt(amount);
    if (isNaN(pts) || pts <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive number", variant: "destructive" });
      return;
    }
    if (selectedKid) addMutation.mutate({ kidId: selectedKid.id, amount: pts });
  };

  const handleDeduct = () => {
    const pts = parseInt(amount);
    if (isNaN(pts) || pts <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive number", variant: "destructive" });
      return;
    }
    if (selectedKid) deductMutation.mutate({ kidId: selectedKid.id, amount: pts });
  };

  const handleReset = () => {
    if (selectedKid) resetMutation.mutate({ kidId: selectedKid.id });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Kids Reward Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-200 rounded w-full"></div>
            <div className="h-16 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (kids.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Kids Reward Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No kids added to your family yet. Add children or teens in the Family Members section above to start tracking their reward points!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Kids Reward Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manage reward points for your kids. Add points for good behavior, or deduct/reset when they redeem rewards.
          </p>
          
          {kids.map((kid) => (
            <div 
              key={kid.id} 
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{ borderLeftColor: kid.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: kid.color }}
                >
                  {kid.avatar || kid.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{kid.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{kid.role}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 min-w-[60px] justify-end">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-lg">{kid.points || 0}</span>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedKid(kid); setShowAddDialog(true); }}
                    className="h-8 w-8 p-0"
                    title="Add points"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedKid(kid); setShowDeductDialog(true); }}
                    className="h-8 w-8 p-0"
                    title="Deduct points"
                    disabled={(kid.points || 0) === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedKid(kid); setShowResetDialog(true); }}
                    className="h-8 w-8 p-0"
                    title="Reset to zero"
                    disabled={(kid.points || 0) === 0}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Points to {selectedKid?.name}</DialogTitle>
            <DialogDescription>
              Award points for completing tasks, good behavior, or achievements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Points to Add</label>
              <Input
                type="number"
                min="1"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Points"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeductDialog} onOpenChange={setShowDeductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deduct Points from {selectedKid?.name}</DialogTitle>
            <DialogDescription>
              Remove points when {selectedKid?.name?.split(' ')[0]} redeems them for a reward.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Points to Deduct</label>
              <Input
                type="number"
                min="1"
                max={selectedKid?.points || 0}
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Current balance: {selectedKid?.points || 0} points
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button onClick={handleDeduct} disabled={deductMutation.isPending}>
              {deductMutation.isPending ? "Deducting..." : "Deduct Points"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset {selectedKid?.name}'s Points</DialogTitle>
            <DialogDescription>
              This will set {selectedKid?.name?.split(' ')[0]}'s points to zero. 
              Current balance: {selectedKid?.points || 0} points.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetMutation.isPending}>
              {resetMutation.isPending ? "Resetting..." : "Reset to Zero"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
