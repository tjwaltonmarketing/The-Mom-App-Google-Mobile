import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Deadline } from "@shared/schema";
import { formatDistanceToNow, isToday, isTomorrow } from "date-fns";

export function UpcomingDeadlines() {
  const { data: deadlines = [] } = useQuery<Deadline[]>({
    queryKey: ["/api/deadlines/upcoming"],
  });

  const getPriorityColor = (deadline: Deadline) => {
    const dueDate = new Date(deadline.dueDate);
    if (isToday(dueDate) || isTomorrow(dueDate)) {
      return 'bg-red-50 border-l-4 border-l-error';
    }
    if (deadline.priority === 'high') {
      return 'bg-red-50 border-l-4 border-l-error';
    }
    if (deadline.priority === 'medium') {
      return 'bg-yellow-50 border-l-4 border-l-warning';
    }
    return 'bg-blue-50 border-l-4 border-l-primary';
  };

  const getPriorityDot = (deadline: Deadline) => {
    const dueDate = new Date(deadline.dueDate);
    if (isToday(dueDate) || isTomorrow(dueDate)) {
      return 'bg-error';
    }
    if (deadline.priority === 'high') {
      return 'bg-error';
    }
    if (deadline.priority === 'medium') {
      return 'bg-warning';
    }
    return 'bg-primary';
  };

  const formatDueDate = (dueDate: Date) => {
    if (isTomorrow(dueDate)) {
      return 'Due tomorrow';
    }
    return `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Clock className="text-warning mr-2 h-5 w-5" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {deadlines.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No upcoming deadlines</p>
          ) : (
            deadlines.slice(0, 5).map((deadline) => (
              <div
                key={deadline.id}
                className={`flex items-center space-x-3 p-3 rounded-lg ${getPriorityColor(deadline)}`}
              >
                <div className={`w-2 h-2 rounded-full ${getPriorityDot(deadline)}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{deadline.title}</p>
                  <p className="text-xs text-gray-600">
                    {formatDueDate(new Date(deadline.dueDate))}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
