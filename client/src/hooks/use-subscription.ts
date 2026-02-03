import { useQuery } from "@tanstack/react-query";

interface SubscriptionData {
  subscriptionPlan: "trial" | "individual" | "family" | "expired";
  subscriptionStatus: string;
  trialDaysLeft?: number;
  isFamilyMember?: boolean;
}

export function useSubscription() {
  const { data: subscription, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
  });

  const isIndividualPlan = subscription?.subscriptionPlan === "individual";
  const isFamilyPlan = subscription?.subscriptionPlan === "family";
  const isTrial = subscription?.subscriptionPlan === "trial";
  const isExpired = subscription?.subscriptionPlan === "expired";

  const canAddFamilyMembers = isFamilyPlan || isTrial;
  const canAssignTasks = isFamilyPlan || isTrial;
  const canShareCalendar = isFamilyPlan || isTrial;
  const canAccessPasswordVault = isFamilyPlan || isTrial || isIndividualPlan; // Individual can use vault, just not share
  const canSharePasswords = isFamilyPlan || isTrial; // Only Family/Trial can share passwords
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
