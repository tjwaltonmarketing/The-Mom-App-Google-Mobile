import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, User } from "lucide-react";

interface HouseholdSettings {
  id: number;
  familyId: number;
  dishwasherIsClean: boolean;
  dishwasherLastUpdated: string;
  dishwasherLastUpdatedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export function HouseholdStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["/api/household-settings"],
    retry: 1
  });

  const updateDishwasherMutation = useMutation({
    mutationFn: async (isClean: boolean) => {
      return await apiRequest("PUT", "/api/household-settings/dishwasher", { isClean });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/household-settings"] });
      toast({
        title: "Status Updated",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDishwasherToggle = (checked: boolean) => {
    updateDishwasherMutation.mutate(checked);
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dishwasher Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dishwasher Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            <p className="text-sm">Unable to load dishwasher status</p>
            <p className="text-xs mt-1">Please refresh the page or try again later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Dishwasher Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="dishwasher-status" className="text-base font-medium">
              Dirty / Clean
            </Label>
            {settings?.dishwasherLastUpdated && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Updated {formatLastUpdated(settings.dishwasherLastUpdated)}</span>
              </div>
            )}
          </div>
          <Switch
            id="dishwasher-status"
            checked={settings?.dishwasherIsClean || false}
            onCheckedChange={handleDishwasherToggle}
            disabled={updateDishwasherMutation.isPending}
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          {settings?.dishwasherIsClean ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              ✓ Clean or needs to be unloaded
            </span>
          ) : (
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              ○ Dirty or needs to be loaded
            </span>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
          All family members can see and update this status to help coordinate household tasks.
        </div>
      </CardContent>
    </Card>
  );
}