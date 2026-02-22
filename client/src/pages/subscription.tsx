import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Calendar, CreditCard, Gift, Settings, AlertTriangle, XCircle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { authFetch, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SubscriptionPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
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

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/portal", {
        returnUrl: window.location.href,
      });
      return res.json();
    },
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
    onError: () => {
      toast({
        title: "Unable to open billing portal",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (plan: "individual" | "family") => {
      const res = await apiRequest("POST", "/api/checkout/create-session", {
        plan,
        interval: billingCycle,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Unable to start checkout",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscription/cancel"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      setShowCancelDialog(false);
      toast({
        title: "Subscription cancelled",
        description: "You'll continue to have access until the end of your current billing period.",
      });
    },
    onError: () => {
      toast({
        title: "Unable to cancel",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const defaultSubscription = {
    subscriptionPlan: "trial",
    subscriptionStatus: "active",
    trialDaysLeft: 0,
    nextBillingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  };

  const currentSubscription = subscription || defaultSubscription;
  const hasStripeSubscription = !!currentSubscription.stripeSubscriptionId;
  const isPaying = hasStripeSubscription && 
    ["active", "cancelling"].includes(currentSubscription.subscriptionStatus);
  const isCancelling = currentSubscription.subscriptionStatus === "cancelling";
  const isTrial = !!currentSubscription.isOnTrial;
  const isActiveNonStripe = !hasStripeSubscription && 
    !isTrial &&
    currentSubscription.subscriptionStatus === "active";

  const plans = {
    individual: {
      name: "Individual",
      description: "Perfect for single parents",
      monthly: 9.99,
      yearly: 99.99,
      features: [
        "1 user account",
        "All core features",
        "Voice assistant",
        "Smart notifications",
        "Secure password vault"
      ]
    },
    family: {
      name: "Family Plan",
      description: "Up to 4 users: Mom, Dad, Grandma, Grandpa",
      monthly: 19.99,
      yearly: 199.99,
      features: [
        "Up to 4 unique user accounts with separate logins",
        "Shared family calendar with privacy controls",
        "Private calendars + selective sharing options",
        "Family communication hub with message delivery",
        "Collaborative meal planning and grocery lists",
        "SMS & email delivery to all family members",
        "Priority support"
      ],
      popular: true
    }
  };

  const getPlanDisplayName = () => {
    if (currentSubscription.subscriptionPlan === "family") return "Family Plan";
    if (currentSubscription.subscriptionPlan === "individual") return "Individual Plan";
    return "Free Trial";
  };

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="text-primary" size={28} />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900">
              Subscription
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 blue-light-filter:text-gray-700">
            Manage your family plan and billing settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Plan Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {isPaying ? (
                    <CreditCard className="text-primary" size={20} />
                  ) : (
                    <Gift className="text-green-600" size={20} />
                  )}
                  {getPlanDisplayName()}
                </CardTitle>
                {isCancelling ? (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    Cancelling
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {isTrial ? `${currentSubscription.trialDaysLeft || 0} days left` : "Active"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isTrial && (
                  <p className="text-gray-600 dark:text-gray-400">
                    You're currently enjoying full access to The Mom App during your 14-day free trial.
                  </p>
                )}

                {isPaying && !isCancelling && (
                  <p className="text-gray-600 dark:text-gray-400">
                    Your {getPlanDisplayName()} is active. Thank you for being a subscriber!
                  </p>
                )}

                {isCancelling && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Your subscription is set to cancel
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          You'll continue to have full access until the end of your current billing period.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {isTrial && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 blue-light-filter:bg-green-25 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">What's included:</h4>
                    <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
                      <li className="flex items-center gap-2">
                        <Check size={16} />
                        Unlimited family members
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} />
                        Voice notes and task creation
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} />
                        SMS & email notifications
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} />
                        Secure password vault
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} />
                        Meal planning tools
                      </li>
                    </ul>
                  </div>
                )}

                {isTrial && currentSubscription.nextBillingDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar size={16} />
                    Trial ends on {new Date(currentSubscription.nextBillingDate).toLocaleDateString()}
                  </div>
                )}

                {isPaying && currentSubscription.nextBillingDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar size={16} />
                    {isCancelling ? "Access until" : "Next billing date:"} {new Date(currentSubscription.nextBillingDate).toLocaleDateString()}
                  </div>
                )}

                {currentSubscription.billingInterval && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CreditCard size={16} />
                    Billed {currentSubscription.billingInterval}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manage Subscription Card - only for paying users */}
          {isPaying && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings size={20} />
                  Manage Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Update your payment method, view invoices, or make changes to your subscription.
                  </p>

                  <Button
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    {portalMutation.isPending ? "Opening..." : "Manage Billing & Payment"}
                  </Button>

                  {!isCancelling && (
                    <Button
                      onClick={() => setShowCancelDialog(true)}
                      variant="ghost"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <XCircle size={16} className="mr-2" />
                      Cancel Subscription
                    </Button>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Need help? Contact us at themomapp.us@gmail.com
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {isActiveNonStripe && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings size={20} />
                  Subscription Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your plan is managed by your account administrator. For billing questions, changes, or support, please contact us.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
                  themomapp.us@gmail.com
                </p>
              </CardContent>
            </Card>
          )}

          {/* Billing Cycle Toggle */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Choose Your Plan</CardTitle>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant={billingCycle === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBillingCycle("monthly")}
                  className="px-6"
                >
                  Monthly
                </Button>
                <Button
                  variant={billingCycle === "yearly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBillingCycle("yearly")}
                  className="px-6"
                >
                  Yearly
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 text-xs">
                    Save 17%
                  </Badge>
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Individual Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plans.individual.name}
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-400">{plans.individual.description}</p>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-primary mb-2">
                  ${plans.individual[billingCycle]}
                  <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                    /{billingCycle === "monthly" ? "month" : "year"}
                  </span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Save $20 compared to monthly billing
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plans.individual.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check size={16} className="text-green-600 dark:text-green-400" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={() => checkoutMutation.mutate("individual")}
                disabled={checkoutMutation.isPending}
              >
                <CreditCard size={18} className="mr-2" />
                {checkoutMutation.isPending ? "Loading..." : "Start Individual Plan"}
              </Button>
            </CardContent>
          </Card>

          {/* Family Plan */}
          <Card className="relative border-primary">
            {plans.family.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1">
                  Most Popular
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plans.family.name}
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-400">{plans.family.description}</p>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-primary mb-2">
                  ${plans.family[billingCycle]}
                  <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                    /{billingCycle === "monthly" ? "month" : "year"}
                  </span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Save $40 compared to monthly billing
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Just ${(plans.family[billingCycle] / 4).toFixed(2)} per person per {billingCycle === "monthly" ? "month" : "year"}
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {plans.family.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check size={16} className="text-green-600 dark:text-green-400" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
                onClick={() => checkoutMutation.mutate("family")}
                disabled={checkoutMutation.isPending}
              >
                <CreditCard size={18} className="mr-2" />
                {checkoutMutation.isPending ? "Loading..." : "Start Family Plan"}
              </Button>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                Cancel anytime. No hidden fees.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Why families love The Mom App</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 blue-light-filter:bg-blue-25 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Check className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <h4 className="font-medium mb-2">Reduce Mental Load</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Stop keeping everything in your head. Let the app remember for you.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 blue-light-filter:bg-green-25 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Calendar className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <h4 className="font-medium mb-2">Family Coordination</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Everyone knows what's happening when with automatic notifications.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 blue-light-filter:bg-purple-25 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Crown className="text-purple-600 dark:text-purple-400" size={24} />
                </div>
                <h4 className="font-medium mb-2">Time Savings</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Voice notes, smart automation, and organized planning save hours weekly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of your current billing period. After that, you'll lose access to premium features. You can always resubscribe later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />
    </div>
  );
}