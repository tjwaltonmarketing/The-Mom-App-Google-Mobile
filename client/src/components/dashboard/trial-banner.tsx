import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Clock, X, Gift, AlertTriangle } from "lucide-react";
import { FaFacebook } from "react-icons/fa";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, authFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function TrialBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [showShareOption, setShowShareOption] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch real subscription data from API
  const { data: subscription } = useQuery({
    queryKey: ["/api/subscription"],
    queryFn: async () => {
      const response = await authFetch("/api/subscription");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    retry: false,
  });

  // Check if user has already received the share bonus
  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/onboarding/share", { 
        platform: "facebook", 
        skipped: false 
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      if (data.bonusAwarded) {
        toast({
          title: "Bonus Claimed!",
          description: "Your trial has been extended to 21 days!",
        });
      }
      setShowShareOption(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to claim bonus. Please try again.",
        variant: "destructive",
      });
    },
  });

  const trialDaysLeft = subscription?.trialDaysLeft || 0;
  const alreadyReceivedBonus = (userData as any)?.referralShareDate !== null && (userData as any)?.referralShareDate !== undefined;

  // Smart reminder schedule:
  // - 8+ days left: If dismissed, don't show until 7 days
  // - 7 days: Show "1 week left" reminder
  // - 3 days: Show urgent "3 days left" reminder
  const getReminderThreshold = (daysLeft: number): string => {
    if (daysLeft <= 3) return "3days";
    if (daysLeft <= 7) return "7days";
    return "initial";
  };

  useEffect(() => {
    if (!subscription || subscription.subscriptionPlan !== "trial") return;
    
    const currentThreshold = getReminderThreshold(trialDaysLeft);
    const dismissedAt = localStorage.getItem('trialBannerDismissedAt');
    
    // If dismissed at a higher threshold, show again at lower thresholds
    if (dismissedAt) {
      if (dismissedAt === "initial" && (currentThreshold === "7days" || currentThreshold === "3days")) {
        // Time to show the 7-day or 3-day reminder
        setIsVisible(true);
      } else if (dismissedAt === "7days" && currentThreshold === "3days") {
        // Time to show the 3-day reminder
        setIsVisible(true);
      } else if (dismissedAt === currentThreshold) {
        // Already dismissed at this threshold
        setIsVisible(false);
      }
    }
  }, [subscription, trialDaysLeft]);

  const handleClose = () => {
    setIsVisible(false);
    // Store which threshold they dismissed at
    const currentThreshold = getReminderThreshold(trialDaysLeft);
    localStorage.setItem('trialBannerDismissedAt', currentThreshold);
  };

  // Get banner style and message based on days left
  const getBannerStyle = () => {
    if (trialDaysLeft <= 3) {
      return {
        gradient: "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20",
        border: "border-orange-300 dark:border-orange-700",
        iconBg: "bg-orange-100 dark:bg-orange-900/40",
        title: "Trial Ending Soon!",
        titleColor: "text-orange-900 dark:text-orange-200",
        textColor: "text-orange-700 dark:text-orange-300",
        icon: AlertTriangle,
        urgent: true,
      };
    }
    if (trialDaysLeft <= 7) {
      return {
        gradient: "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20",
        border: "border-amber-300 dark:border-amber-700",
        iconBg: "bg-amber-100 dark:bg-amber-900/40",
        title: "1 Week Left in Trial",
        titleColor: "text-amber-900 dark:text-amber-200",
        textColor: "text-amber-700 dark:text-amber-300",
        icon: Clock,
        urgent: false,
      };
    }
    return {
      gradient: "bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20",
      border: "border-pink-200 dark:border-pink-800",
      iconBg: "bg-pink-100 dark:bg-pink-900/40",
      title: "Free Trial Active",
      titleColor: "text-pink-900 dark:text-pink-200",
      textColor: "text-pink-700 dark:text-pink-300",
      icon: Crown,
      urgent: false,
    };
  };

  const bannerStyle = getBannerStyle();

  const openFacebookShare = () => {
    setHasShared(true);
    const shareUrl = "https://themom.app";
    const shareText = "I just discovered The Mom App - it's like having a personal assistant for all the family chaos! Check it out:";
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const handleClaimBonus = () => {
    shareMutation.mutate();
  };

  // Don't show banner if not visible or not on trial
  if (!isVisible || !subscription || subscription.subscriptionPlan !== "trial") {
    return null;
  }

  const IconComponent = bannerStyle.icon;
  
  return (
    <Card className={`${bannerStyle.gradient} ${bannerStyle.border}`}>
      <CardContent className="p-4">
        {showShareOption ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="text-pink-500" size={20} />
                <span className="font-semibold text-pink-900 dark:text-pink-200">Share for +7 days free!</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareOption(false)}
                className="h-6 w-6 p-0 text-pink-600"
              >
                <X size={14} />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={openFacebookShare}
                size="sm"
                className="flex-1 bg-[#1877F2] hover:bg-[#166FE5] text-white"
              >
                <FaFacebook className="mr-2 h-4 w-4" />
                {hasShared ? "Shared!" : "Share on Facebook"}
              </Button>
              {hasShared && (
                <Button
                  onClick={handleClaimBonus}
                  size="sm"
                  disabled={shareMutation.isPending}
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                >
                  {shareMutation.isPending ? "Claiming..." : "Claim Bonus!"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${bannerStyle.iconBg} rounded-lg flex items-center justify-center`}>
                <IconComponent className={bannerStyle.urgent ? "text-orange-500" : "text-primary"} size={20} />
              </div>
              <div>
                <h3 className={`font-semibold ${bannerStyle.titleColor}`}>
                  {bannerStyle.title}
                </h3>
                <p className={`text-sm ${bannerStyle.textColor} flex items-center gap-1`}>
                  <Clock size={14} />
                  {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} remaining
                  {bannerStyle.urgent && " - Upgrade to keep your data!"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!alreadyReceivedBonus && !bannerStyle.urgent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareOption(true)}
                  className="border-pink-300 text-pink-600 hover:bg-pink-50 dark:border-pink-700 dark:text-pink-400"
                >
                  <Gift size={14} className="mr-1" />
                  +7 Days Free
                </Button>
              )}
              <Button asChild size="sm" className={bannerStyle.urgent 
                ? "bg-orange-500 hover:bg-orange-600 text-white" 
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }>
                <Link href="/upgrade">
                  Upgrade Now
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className={`h-8 w-8 p-0 ${bannerStyle.urgent 
                  ? "text-orange-600 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-400" 
                  : "text-pink-600 hover:text-pink-800 hover:bg-pink-100 dark:text-pink-400 dark:hover:text-pink-300 dark:hover:bg-pink-900/20"
                }`}
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}