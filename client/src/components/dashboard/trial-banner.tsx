import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Clock } from "lucide-react";
import { Link } from "wouter";

export function TrialBanner() {
  // Mock trial data - in real app this would come from API
  const trialDaysLeft = 12;
  
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
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/subscription">
              Upgrade Now
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}