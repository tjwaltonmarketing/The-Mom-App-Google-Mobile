import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const startTrialMutation = useMutation({
    mutationFn: async (plan: "individual" | "family") => {
      return apiRequest("POST", "/api/subscription/start-trial", { plan });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Welcome to The Mom App!",
        description: "Your 14-day free trial has started.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start trial. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartTrial = (plan: "individual" | "family") => {
    startTrialMutation.mutate(plan);
  };

  const handleComplete = () => {
    setLocation("/");
  };

  return (
    <OnboardingFlow 
      onComplete={handleComplete}
      onStartTrial={handleStartTrial}
      isLoading={startTrialMutation.isPending}
    />
  );
}
