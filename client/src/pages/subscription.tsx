import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Calendar, CreditCard, Gift } from "lucide-react";
import { useState } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";

export default function SubscriptionPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Mock subscription data - in real app this would come from API
  const subscription = {
    status: "trial",
    trialDaysLeft: 12,
    plan: "family",
    nextBillingDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
  };

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
        "Up to 4 coordinating adults",
        "Shared family calendar",
        "Family communication hub",
        "Collaborative meal planning",
        "SMS & email delivery",
        "Priority support"
      ],
      popular: true
    }
  };

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
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
                  <Gift className="text-green-600" size={20} />
                  Free Trial Active
                </CardTitle>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {subscription.trialDaysLeft} days left
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  You're currently enjoying full access to The Mom App during your 14-day free trial.
                </p>
                
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

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar size={16} />
                  Trial ends on {subscription.nextBillingDate.toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>

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

              <Button className="w-full" variant="outline" size="lg">
                <CreditCard size={18} className="mr-2" />
                Start Individual Plan
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

              <Button className="w-full bg-primary hover:bg-primary/90" size="lg">
                <CreditCard size={18} className="mr-2" />
                Start Family Plan
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

      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />
    </div>
  );
}