import { useQuery } from "@tanstack/react-query";

interface SubscriptionData {
  subscriptionPlan: "trial" | "individual" | "family" | "expired";
  subscriptionStatus: string;
  trialDaysLeft?: number;
  isOnTrial?: boolean;
  isFamilyMember?: boolean;
}

export function useSubscription() {
  const { data: subscription, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
  });

  const isIndividualPlan = subscription?.subscriptionPlan === "individual";
  const isFamilyPlan = subscription?.subscriptionPlan === "family";
  const isTrial = !!subscription?.isOnTrial;
  const isExpired = subscription?.subscriptionStatus === "expired";

  const canAddFamilyMembers = isFamilyPlan || isTrial;
  const canAssignTasks = isFamilyPlan || isTrial;
  const canShareCalendar = isFamilyPlan || isTrial;
  const canAccessPasswordVault = isFamilyPlan || isTrial || isIndividualPlan;
  const canSharePasswords = isFamilyPlan || isTrial;
  const canInviteTeens = isFamilyPlan || isTrial;
  const canInviteParents = isFamilyPlan || isTrial;

  return {
    subscription,
    isLoading,
    isIndividualPlan,
    isFamilyPlan,
    isTrial,
    isExpired,
    canAddFamilyMembers,
    canAssignTasks,
    canShareCalendar,
    canAccessPasswordVault,
    canSharePasswords,
    canInviteTeens,
    canInviteParents,
  };
}
