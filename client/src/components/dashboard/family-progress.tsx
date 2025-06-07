import { useQuery } from "@tanstack/react-query";
import { Trophy, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DashboardStats {
  todayTasks: number;
  todayEvents: number;
  weeklyTasksCompletion: number;
  familyEventsAttended: number;
}

export function FamilyProgress() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const weeklyProgress = stats?.weeklyTasksCompletion || 0;
  const eventsProgress = stats?.familyEventsAttended || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Trophy className="text-warning mr-2 h-5 w-5" />
          Family Progress
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Weekly Tasks Completed</span>
            <span className="font-medium">{weeklyProgress}%</span>
          </div>
          <Progress value={weeklyProgress} className="h-2" />
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Family Events Attended</span>
            <span className="font-medium">{eventsProgress}%</span>
          </div>
          <Progress value={eventsProgress} className="h-2" />
        </div>
        
        {weeklyProgress >= 80 && (
          <div className="bg-yellow-50 rounded-lg p-3 mt-4">
            <div className="flex items-center">
              <Star className="text-warning mr-2 h-4 w-4" />
              <span className="text-sm font-medium">Family Achievement!</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Everyone completed their chores this week! 🎉
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
