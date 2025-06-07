import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  todayTasks: number;
  todayEvents: number;
  weeklyTasksCompletion: number;
  familyEventsAttended: number;
}

export function WelcomeHeader() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="mb-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            {getGreeting()}, Johnson Family! 👋
          </h2>
          <p className="text-gray-600 mt-1">Here's what's happening today</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {stats?.todayTasks || 0}
            </div>
            <div className="text-xs text-gray-600">Tasks Due</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary">
              {stats?.todayEvents || 0}
            </div>
            <div className="text-xs text-gray-600">Events Today</div>
          </div>
        </div>
      </div>
    </div>
  );
}
