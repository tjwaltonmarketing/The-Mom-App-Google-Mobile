import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Trophy } from "lucide-react";
import { type FamilyMember } from "@shared/schema";

export function FamilyPoints() {
  // Use family-members query and filter for kids - this works reliably with auth
  const { data: familyMembers = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
  });
  
  // Filter to only children and teens for point display
  const kids = familyMembers.filter(m => m.role === 'child' || m.role === 'teen');

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Family Earned Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (kids.length === 0) {
    return (
      <Card className="bg-white dark:bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Family Earned Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No kids added yet. Add children or teens in Settings to track their points!
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPoints = kids.reduce((sum, kid) => sum + (kid.points || 0), 0);

  return (
    <Card className="bg-white dark:bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Family Earned Points
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            Total: {totalPoints}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {kids.map((kid) => (
          <div 
            key={kid.id} 
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: kid.color }}
              >
                {kid.avatar || kid.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{kid.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{kid.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-lg">{kid.points || 0}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
