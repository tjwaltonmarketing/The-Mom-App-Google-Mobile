import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Clock } from "lucide-react";
import { Link } from "wouter";

export function TrialBanner() {
  // Mock trial data - in real app this would come from API
  const trialDaysLeft = 12;
  
  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 blue-light-filter:from-purple-25 blue-light-filter:to-blue-25 border-purple-200 dark:border-purple-800 blue-light-filter:border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 blue-light-filter:bg-purple-100 rounded-lg flex items-center justify-center">
              <Crown className="text-purple-600 dark:text-purple-400 blue-light-filter:text-purple-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-200 blue-light-filter:text-purple-900">
                Free Trial Active
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-300 blue-light-filter:text-purple-700 flex items-center gap-1">
                <Clock size={14} />
                {trialDaysLeft} days remaining
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
            <Link href="/subscription">
              Upgrade Now
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}