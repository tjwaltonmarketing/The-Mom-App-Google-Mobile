import { useQuery } from "@tanstack/react-query";
import { Trophy, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiUrl } from "@/lib/config";

interface TeenProfile {
  id: number;
  firstName: string;
  lastName: string;
  points: number;
  streak: number;
  favoriteColor: string;
}

export function FamilyProgress() {
  const { data: teens, isLoading } = useQuery<TeenProfile[]>({
    queryKey: ["/api/teen-profiles"],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/teen-profiles'), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        return [];
      }
      
      return response.json();
    }
  });

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      purple: 'bg-purple-100 text-purple-700',
      pink: 'bg-pink-100 text-pink-700',
      orange: 'bg-orange-100 text-orange-700',
    };
    return colors[color] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Trophy className="text-yellow-500 mr-2 h-5 w-5" />
          Family Earned Points
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !teens || teens.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-sm text-gray-500">No teen accounts yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Invite your kids from Settings to track their points
            </p>
          </div>
        ) : (
          teens.map((teen) => (
            <div 
              key={teen.id} 
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getColorClass(teen.favoriteColor)}`}>
                  {teen.firstName.charAt(0)}
                </div>
                <span className="font-medium text-sm">{teen.firstName}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 mr-1" />
                  <span className="font-bold text-sm">{teen.points || 0}</span>
                  <span className="text-xs text-gray-500 ml-1">pts</span>
                </div>
                {teen.streak > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    🔥 {teen.streak}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
