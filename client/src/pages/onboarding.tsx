import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { ShareModal } from "@/components/share-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(
    () => localStorage.getItem("pending_share_claim") === "true"
  );

  const showShare = () => {
    localStorage.setItem("pending_share_claim", "true");
    setShowShareModal(true);
  };

  const clearShare = () => {
    localStorage.removeItem("pending_share_claim");
  };

  const startTrialMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: "individual" | "family"; interval: "monthly" | "yearly" }) => {
      if (Capacitor.getPlatform() === "ios") {
        // iOS uses RevenueCat — start a local trial record
        return apiRequest("POST", "/api/subscription/start-trial", { plan });
      }
      // Android/web — create Stripe checkout session with 14-day trial
      const pendingCoupon = localStorage.getItem('pendingCoupon') || undefined;
      const response = await apiRequest("POST", "/api/checkout/create-session", { plan, interval, trialDays: 14, coupon: pendingCoupon });
      return response.json();
    },
    onSuccess: (data: any) => {
      if (Capacitor.getPlatform() === "ios") {
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        localStorage.setItem("onboarding_completed", "true");
        toast({ title: "Welcome to The Mom App!", description: "Your free trial has started." });
        window.location.href = "/";
      } else if (data?.url) {
        // Redirect to Stripe Checkout
        localStorage.setItem("onboarding_completed", "true");
        localStorage.removeItem("pendingCoupon");
        window.location.href = data.url;
      } else {
        // Fallback if Stripe URL missing
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        localStorage.setItem("onboarding_completed", "true");
        toast({ title: "Welcome to The Mom App!", description: "Your free trial has started." });
        window.location.href = "/";
      }
    },
    onError: (error: any) => {
      console.error("Start trial error:", error);
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      localStorage.setItem("onboarding_completed", "true");
      toast({ title: "Welcome to The Mom App!", description: "Your free trial has started." });
      window.location.href = "/";
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (platform: "facebook" | "instagram" | "skip") => {
      const response = await apiRequest("POST", "/api/referral/share", { platform });
      return response.json();
    },
    onSuccess: (data: any) => {
      clearShare();
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      localStorage.setItem("onboarding_completed", "true");
      if (data.bonusAwarded) {
        toast({
          title: "Bonus Week Added!",
          description: "Your trial is now 21 days. Thanks for sharing!",
        });
      } else {
        toast({
          title: "Welcome to The Mom App!",
          description: "Your 14-day free trial has started.",
        });
      }
      window.location.href = "/";
    },
    onError: () => {
      clearShare();
      localStorage.setItem("onboarding_completed", "true");
      toast({
        title: "Welcome to The Mom App!",
        description: "Your 14-day free trial has started.",
      });
      window.location.href = "/";
    },
  });

  const handleStartTrial = (plan: "individual" | "family", interval: "monthly" | "yearly") => {
    startTrialMutation.mutate({ plan, interval });
  };

  const handleShare = (platform: "facebook" | "instagram") => {
    shareMutation.mutate(platform);
  };

  const handleSkip = () => {
    clearShare();
    apiRequest("POST", "/api/referral/share", { platform: "skip" }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    localStorage.setItem("onboarding_completed", "true");
    toast({
      title: "Welcome to The Mom App!",
      description: "Your free trial has started.",
    });
    window.location.href = "/";
  };

  const handleComplete = () => {
    setLocation("/");
  };

  const isIOS = Capacitor.getPlatform() === "ios";

  if (showShareModal && !isIOS) {
    return (
      <ShareModal
        onShare={handleShare}
        onSkip={handleSkip}
        isLoading={shareMutation.isPending}
      />
    );
  }

  return (
    <OnboardingFlow 
      onComplete={handleComplete}
      onStartTrial={handleStartTrial}
      isLoading={startTrialMutation.isPending}
    />
  );
}
