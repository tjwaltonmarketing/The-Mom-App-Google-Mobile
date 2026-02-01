import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Users } from "lucide-react";
import type { HouseholdSettings } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface FamilyDishwasherProps {
  apiEndpoint: string;
  updateEndpoint: string;
}

export function FamilyDishwasher({ apiEndpoint, updateEndpoint }: FamilyDishwasherProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: settings, isLoading, error } = useQuery<HouseholdSettings>({
    queryKey: [apiEndpoint],
    queryFn: async () => {
      console.log("FamilyDishwasher: Making API call to", apiEndpoint);
      const response = await apiRequest("GET", apiEndpoint);
      console.log("FamilyDishwasher: API response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("FamilyDishwasher: API error:", errorText);
        throw new Error(`API call failed: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      console.log("FamilyDishwasher: API success data:", data);
      return data;
    },
    enabled: !!user, // Only fetch when user is authenticated
    retry: 1,
    staleTime: 10000, // Cache for 10 seconds
    refetchInterval: 30000, // Auto-refresh every 30 seconds to stay in sync with family
  });

  const updateDishwasherMutation = useMutation({
    mutationFn: async (isClean: boolean) => {
      return await apiRequest("PUT", updateEndpoint, { isClean });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      toast({
        title: "Status Updated",
        description: data?.message || "Dishwasher status updated successfully",
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

  const formatLastUpdated = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card data-testid="card-dishwasher-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Family Dishwasher
          </CardTitle>
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
      <Card data-testid="card-dishwasher-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Family Dishwasher
          </CardTitle>
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
    <Card data-testid="card-dishwasher">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Family Dishwasher
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
                <span data-testid="text-last-updated">Updated {formatLastUpdated(settings.dishwasherLastUpdated)}</span>
              </div>
            )}
          </div>
          <Switch
            id="dishwasher-status"
            data-testid="switch-dishwasher"
            checked={settings?.dishwasherIsClean || false}
            onCheckedChange={handleDishwasherToggle}
            disabled={updateDishwasherMutation.isPending}
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          {settings?.dishwasherIsClean ? (
            <span className="text-green-600 dark:text-green-400 font-medium" data-testid="status-clean">
              ✓ Clean or needs to be unloaded
            </span>
          ) : (
            <span className="text-orange-600 dark:text-orange-400 font-medium" data-testid="status-dirty">
              ○ Dirty or needs to be loaded
            </span>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md" data-testid="text-sharing-info">
          Shared with all family members - help keep everyone informed!
        </div>
      </CardContent>
    </Card>
  );
}