import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Mic, Bot, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";

interface DashboardStats {
  todayTasks: number;
  pendingTasks: number;
  todayEvents: number;
  weeklyTasksCompletion: number;
  familyEventsAttended: number;
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WelcomeHeaderProps {
  onStartVoiceNote?: () => void;
}

export function WelcomeHeader({ onStartVoiceNote }: WelcomeHeaderProps) {
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);

  // Check if trial banner was dismissed
  useEffect(() => {
    const checkBannerStatus = () => {
      const isDismissed = sessionStorage.getItem('trialBannerDismissed');
      setTrialBannerDismissed(isDismissed === 'true');
    };
    
    checkBannerStatus();
    
    // Listen for storage changes to update when banner is dismissed
    const handleStorageChange = () => checkBannerStatus();
    window.addEventListener('storage', handleStorageChange);
    
    // Poll for sessionStorage changes since storage event doesn't fire for same-window changes
    const interval = setInterval(checkBannerStatus, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      console.log("Fetching dashboard stats...");
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Dashboard stats fetched:", data);
      return data;
    },
    staleTime: 0, // Always consider data stale for immediate updates
    gcTime: 0,    // Don't cache in garbage collection
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
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

  const { data: familyInfo } = useQuery<{ id: number; name: string }>({
    queryKey: ["/api/family"],
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className={`animate-fadeIn ${trialBannerDismissed ? 'mb-6 md:mb-6 -mt-2 md:mt-0' : 'mb-6'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
            {getGreeting()}, {familyInfo?.name || `${user?.lastName || "Your"} Family`}!
          </h2>
          <p className="text-gray-600 mt-1">Here's what's happening today</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-500">
                {stats?.pendingTasks || 0}
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100 blue-light-filter:text-gray-900 font-semibold">Tasks Due</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-500">
                {stats?.todayEvents || 0}
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100 blue-light-filter:text-gray-900 font-semibold">Events Today</div>
            </div>
          </div>
          
          {/* Mobile: Circular quick action buttons - pushed to far right */}
          <div className="md:hidden flex space-x-2 ml-auto">
            <Button
              onClick={onStartVoiceNote}
              size="sm"
              className="bg-accent hover:bg-orange-400 text-white w-8 h-8 p-0 rounded-full"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white w-8 h-8 p-0 rounded-full">
              <Link href="/tutorials">
                <BookOpen className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white w-8 h-8 p-0 rounded-full">
              <Link href="/ai-assistant">
                <Bot className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
