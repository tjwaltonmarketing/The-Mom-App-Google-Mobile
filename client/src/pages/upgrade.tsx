import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Users, Sparkles, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserSubscription } from "@shared/schema";

const plans = {
  individual: {
    name: "Individual",
    icon: Crown,
    color: "from-pink-500 to-rose-500",
    features: [
      "Smart Calendar with Privacy Controls",
      "AI Voice Assistant",
      "Task Management",
      "Meal Planning",
      "Grocery Lists",
      "Password Vault",
    ],
    monthly: { price: "$5.99", priceValue: 599 },
    yearly: { price: "$59.99", priceValue: 5999, savings: "Save $12/year" },
  },
  family: {
    name: "Family",
    icon: Users,
    color: "from-purple-500 to-indigo-500",
    popular: true,
    features: [
      "Everything in Individual, plus:",
      "Up to 6 Family Members",
      "Teen Accounts with Gamification",
      "Shared Family Calendar",
      "Task Assignment & Points",
      "Family Password Sharing",
    ],
    monthly: { price: "$9.99", priceValue: 999 },
    yearly: { price: "$99.99", priceValue: 9999, savings: "Save $20/year" },
  },
};

export default function Upgrade() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<"individual" | "family">("family");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("yearly");

  const cancelled = search.includes("cancelled=true");

  const { data: authUser, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: subscription } = useQuery<UserSubscription>({
    queryKey: ["/api/subscription"],
    enabled: !!authUser,
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: string; interval: string }) => {
      const response = await apiRequest("POST", "/api/checkout/create-session", { plan, interval });
      return response as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!authLoading && !authUser) {
      setLocation("/");
    }
  }, [authLoading, authUser, setLocation]);

  if (authLoading || !authUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleUpgrade = () => {
    checkoutMutation.mutate({ plan: selectedPlan, interval: billingInterval });
  };

  const trialDaysLeft = subscription?.trialEndDate 
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isTrialExpired = trialDaysLeft <= 0 && subscription?.subscriptionPlan === "trial";

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white py-8 px-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6 text-gray-600"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to App
        </Button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-pink-500" />
          </div>
          
          {isTrialExpired ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Trial Has Ended</h1>
              <p className="text-gray-600">Subscribe now to keep using all the amazing features!</p>
            </>
          ) : cancelled ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Ready When You Are</h1>
              <p className="text-gray-600">No pressure! You still have {trialDaysLeft} days left on your trial.</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
              <p className="text-gray-600">
                {trialDaysLeft > 0 
                  ? `You have ${trialDaysLeft} days left on your trial. Subscribe early and never lose access!`
                  : "Unlock the full power of The Mom App"}
              </p>
            </>
          )}
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-full inline-flex">
            <Button
              variant={billingInterval === "monthly" ? "default" : "ghost"}
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-full px-6 ${billingInterval === "monthly" ? "bg-pink-500 hover:bg-pink-600" : ""}`}
            >
              Monthly
            </Button>
            <Button
              variant={billingInterval === "yearly" ? "default" : "ghost"}
              onClick={() => setBillingInterval("yearly")}
              className={`rounded-full px-6 ${billingInterval === "yearly" ? "bg-pink-500 hover:bg-pink-600" : ""}`}
            >
              Yearly
              <Badge className="ml-2 bg-green-500 text-white text-xs">Save 17%</Badge>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {Object.entries(plans).map(([key, plan]) => {
            const planKey = key as "individual" | "family";
            const isSelected = selectedPlan === planKey;
            const pricing = billingInterval === "monthly" ? plan.monthly : plan.yearly;
            const Icon = plan.icon;

            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? "ring-2 ring-pink-500 shadow-lg scale-[1.02]" 
                    : "hover:shadow-md"
                } ${plan.popular ? "relative overflow-hidden" : ""}`}
                onClick={() => setSelectedPlan(planKey)}
              >
                {plan.popular && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r ${plan.color} mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{pricing.price}</span>
                    <span className="text-gray-500">/{billingInterval === "monthly" ? "mo" : "yr"}</span>
                  </div>
                  {billingInterval === "yearly" && pricing.savings && (
                    <Badge variant="secondary" className="w-fit text-green-600 bg-green-100">
                      {pricing.savings}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            onClick={handleUpgrade}
            disabled={checkoutMutation.isPending}
            className="w-full md:w-auto px-12 py-6 text-lg bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
          >
            {checkoutMutation.isPending ? "REDIRECTING TO CHECKOUT..." : `SUBSCRIBE TO ${selectedPlan.toUpperCase()}`}
          </Button>
          <p className="mt-4 text-sm text-gray-500">
            Secure payment powered by Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
