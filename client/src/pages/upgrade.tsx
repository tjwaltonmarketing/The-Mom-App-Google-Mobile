import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Users, Sparkles, ArrowLeft, Apple, Loader2, RotateCcw, ShoppingBag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Capacitor } from "@capacitor/core";
import { useToast } from "@/hooks/use-toast";
import type { UserSubscription } from "@shared/schema";
import { logFBEvent, FB_EVENTS } from "@/lib/facebook-events";
import {
  isRevenueCatAvailable,
  initRevenueCat,
  revenueCatLogIn,
  getOfferings,
  purchaseProduct,
  restorePurchases,
  getPackageForPlan,
  type RCPackage,
} from "@/services/revenuecat";

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
  const [rcPackages, setRcPackages] = useState<RCPackage[]>([]);
  const [rcLoading, setRcLoading] = useState(false);
  const [rcPurchasing, setRcPurchasing] = useState(false);
  const [pendingCoupon] = useState(() => localStorage.getItem('pendingCoupon'));
  const isIOS = Capacitor.getPlatform() === "ios";
  const isAndroid = Capacitor.getPlatform() === "android";
  const isNativePurchase = isIOS || isAndroid;

  const cancelled = search.includes("cancelled=true");

  const { data: authUser, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: subscription } = useQuery<UserSubscription>({
    queryKey: ["/api/subscription"],
    enabled: !!authUser,
  });

  useEffect(() => {
    if (isNativePurchase && isRevenueCatAvailable() && authUser) {
      setRcLoading(true);
      initRevenueCat()
        .then(async (ok) => {
          if (!ok) return;
          const user = authUser as any;
          if (user?.id) {
            await revenueCatLogIn(String(user.id));
          }
          const pkgs = await getOfferings();
          setRcPackages(pkgs);
        })
        .catch(console.error)
        .finally(() => setRcLoading(false));
    }
  }, [isNativePurchase, authUser]);

  const handleNativePurchase = async () => {
    const pkg = getPackageForPlan(rcPackages, selectedPlan, billingInterval);
    if (!pkg) {
      toast({
        title: "Product unavailable",
        description: "This subscription is not available right now. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    setRcPurchasing(true);
    try {
      const result = await purchaseProduct(pkg.productIdentifier);
      if (result.cancelled) return;
      if (result.success) {
        const endpoint = isAndroid
          ? "/api/subscription/google-purchase"
          : "/api/subscription/apple-purchase";
        await apiRequest("POST", endpoint, {
          productIdentifier: pkg.productIdentifier,
          plan: selectedPlan,
          interval: billingInterval,
          activeEntitlements: result.customerInfo?.activeEntitlements || [],
          expirationDate: result.customerInfo?.latestExpirationDate,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        toast({
          title: "Subscription activated!",
          description: `Your ${selectedPlan === "family" ? "Family" : "Individual"} plan is now active.`,
        });
        setLocation("/");
      } else {
        toast({
          title: "Purchase failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Purchase error",
        description: "Unable to complete purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRcPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    setRcLoading(true);
    try {
      const info = await restorePurchases();
      if (info && info.activeEntitlements.length > 0) {
        const endpoint = isAndroid
          ? "/api/subscription/google-restore"
          : "/api/subscription/apple-restore";
        await apiRequest("POST", endpoint, {
          activeEntitlements: info.activeEntitlements,
          activeSubscriptions: info.activeSubscriptions,
          expirationDate: info.latestExpirationDate,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        toast({
          title: "Purchases restored",
          description: "Your subscription has been restored successfully.",
        });
        setLocation("/");
      } else {
        toast({
          title: "No purchases found",
          description: isAndroid
            ? "No active subscriptions were found for your Google account."
            : "No active subscriptions were found for your Apple ID.",
        });
      }
    } catch {
      toast({
        title: "Restore failed",
        description: "Unable to restore purchases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRcLoading(false);
    }
  };

  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: string; interval: string }) => {
      const pendingCoupon = localStorage.getItem('pendingCoupon') || undefined;
      // Win-back users who never completed a Stripe checkout get their 14-day trial
      const hasHadStripeTrial = !!(subscription as any)?.stripeSubscriptionId;
      const trialDays = (pendingCoupon && !hasHadStripeTrial) ? 14 : undefined;
      const isTrial = !hasHadStripeTrial;
      const response = await apiRequest("POST", "/api/checkout/create-session", { plan, interval, coupon: pendingCoupon, trialDays });
      const data = await response.json();
      return { url: data.url as string, isTrial };
    },
    onSuccess: (data) => {
      if (data.url) {
        localStorage.removeItem("pendingCoupon");
        logFBEvent(data.isTrial ? FB_EVENTS.START_TRIAL : FB_EVENTS.INITIATE_CHECKOUT);
        window.open(data.url, "_blank");
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

  const isTrialExpired = trialDaysLeft <= 0 && subscription?.isOnTrial;

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

        {pendingCoupon && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-green-800 text-sm">Special offer applied!</p>
              <p className="text-green-700 text-sm">You'll get your <strong>14-day free trial</strong>, then <strong>25% off your first month</strong> — automatically applied at checkout.</p>
            </div>
          </div>
        )}

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
          {isNativePurchase ? (
            <div className="space-y-4">
              {(() => {
                const pkg = getPackageForPlan(rcPackages, selectedPlan, billingInterval);
                return (
                  <>
                    {pkg?.introPrice?.paymentMode === "freeTrial" && (
                      <p className="text-sm text-green-600 font-medium">
                        Includes {pkg.introPrice.periodDays}-day free trial
                      </p>
                    )}
                    <Button
                      onClick={handleNativePurchase}
                      disabled={rcPurchasing || rcLoading}
                      className="w-full md:w-auto px-12 py-6 text-lg bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                    >
                      {rcPurchasing ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : isAndroid ? (
                        <ShoppingBag className="mr-2 h-5 w-5" />
                      ) : (
                        <Apple className="mr-2 h-5 w-5" />
                      )}
                      {rcPurchasing
                        ? "PROCESSING..."
                        : pkg
                          ? `SUBSCRIBE ${pkg.priceString}/${billingInterval === "monthly" ? "MO" : "YR"}`
                          : `SUBSCRIBE TO ${selectedPlan.toUpperCase()}`}
                    </Button>
                    <p className="mt-2 text-sm text-gray-500">
                      {isAndroid
                        ? "Subscription managed by Google Play. Cancel anytime."
                        : "Subscription managed by Apple. Cancel anytime."}
                    </p>
                    <Button
                      variant="ghost"
                      onClick={handleRestorePurchases}
                      disabled={rcLoading}
                      className="text-gray-500"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {rcLoading ? "Restoring..." : "Restore Purchases"}
                    </Button>
                  </>
                );
              })()}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
