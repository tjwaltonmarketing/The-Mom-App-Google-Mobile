import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Clock, X } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function TrialBanner() {
  const [isVisible, setIsVisible] = useState(true);
  
  // Fetch real subscription data from API
  const { data: subscription } = useQuery({
    queryKey: ["/api/subscription"],
    queryFn: async () => {
      const response = await fetch("/api/subscription", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    retry: false,
  });

  const trialDaysLeft = subscription?.trialDaysLeft || 0;

  // Check if banner was dismissed in this session
  useEffect(() => {
    const isDismissed = sessionStorage.getItem('trialBannerDismissed');
    if (isDismissed === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Only hide for this session, will show again on next login
    sessionStorage.setItem('trialBannerDismissed', 'true');
  };

  // Don't show banner if not visible or not on trial
  if (!isVisible || !subscription || subscription.subscriptionPlan !== "trial") {
    return null;
  }
  
  return (
    <Card className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 blue-light-filter:from-pink-25 blue-light-filter:to-rose-25 border-pink-200 dark:border-pink-800 blue-light-filter:border-pink-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/40 blue-light-filter:bg-pink-100 rounded-lg flex items-center justify-center">
              <Crown className="text-primary" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-pink-900 dark:text-pink-200 blue-light-filter:text-pink-900">
                Free Trial Active
              </h3>
              <p className="text-sm text-pink-700 dark:text-pink-300 blue-light-filter:text-pink-700 flex items-center gap-1">
                <Clock size={14} />
                {trialDaysLeft} days remaining
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/subscription">
                Upgrade Now
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 text-pink-600 hover:text-pink-800 hover:bg-pink-100 dark:text-pink-400 dark:hover:text-pink-300 dark:hover:bg-pink-900/20"
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}