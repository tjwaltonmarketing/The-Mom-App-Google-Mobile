import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { ShareModal } from "@/components/share-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);

  const startTrialMutation = useMutation({
    mutationFn: async (plan: "individual" | "family") => {
      return apiRequest("POST", "/api/subscription/start-trial", { plan });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      setShowShareModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start trial. Please try again.",
        variant: "destructive",
      });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (platform: "facebook" | "instagram" | "skip") => {
      const response = await apiRequest("POST", "/api/referral/share", { platform });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
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
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Welcome to The Mom App!",
        description: "Your 14-day free trial has started.",
      });
      setLocation("/");
    },
  });

  const handleStartTrial = (plan: "individual" | "family") => {
    startTrialMutation.mutate(plan);
  };

  const handleShare = (platform: "facebook" | "instagram") => {
    shareMutation.mutate(platform);
  };

  const handleSkip = () => {
    apiRequest("POST", "/api/referral/share", { platform: "skip" }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    toast({
      title: "Welcome to The Mom App!",
      description: "Your free trial has started.",
    });
    setLocation("/");
  };

  const handleComplete = () => {
    setLocation("/");
  };

  if (showShareModal) {
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
