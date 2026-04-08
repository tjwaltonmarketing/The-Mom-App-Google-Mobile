import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronRight, ChevronLeft, Mic, Calendar, ListTodo, UtensilsCrossed, Sparkles, Users, Bell, Gift, Clock, CreditCard } from "lucide-react";
import onboardingSlide1 from "@/assets/images/onboarding-slide-1.png";
import onboardingSlide2 from "@/assets/images/onboarding-slide-2.png";
import onboardingSlide3 from "@/assets/images/onboarding-slide-3.png";
import onboardingSlideCalendar from "@/assets/images/onboarding-slide-calendar.png";
import onboardingSlideTasks from "@/assets/images/onboarding-slide-tasks.png";
import onboardingSlideMeals from "@/assets/images/onboarding-slide-meals.png";
import onboardingSlideAi from "@/assets/images/onboarding-slide-ai.png";
import onboardingSlideFamily from "@/assets/images/onboarding-slide-family.png";
import onboardingSlide4 from "@/assets/images/onboarding-slide-4.png";

interface OnboardingFlowProps {
  onComplete: (plan?: "individual" | "family") => void;
  onStartTrial: (plan: "individual" | "family", interval: "monthly" | "yearly") => void;
  isLoading?: boolean;
}

const slides = [
  {
    id: 1,
    image: onboardingSlide1,
    headline: "You're officially in, Mama.",
    body: "Welcome to The Mom App \u2014 the app that shares the load so you don't have to carry it all.\n\nNo more repeating yourself. No more nagging. The app handles the reminders so you don't have to.",
    reassurance: "Less mental load. More peace of mind.",
    cta: "Let's make mom life easier",
  },
  {
    id: 2,
    image: onboardingSlide2,
    headline: "Everything you juggle. One place.",
    benefits: [
      "Share the load \u2014 stop carrying it all yourself",
      "The app does the nagging so you don't have to",
      "Smart reminders keep everyone on track",
      "Plan meals, manage tasks, and stay organized",
      "Use voice or text \u2014 whatever works for you",
    ],
    tagline: "Less overwhelm. More peace.",
    emotional: "Because you shouldn't have to ask twice.",
    cta: "Show me the features",
  },
  {
    id: 3,
    image: onboardingSlideCalendar,
    icon: "calendar",
    headline: "Smart Calendar",
    subtitle: "Your family's schedule, simplified.",
    featureHighlights: [
      "See everyone's events in one beautiful view",
      "Color-coded by family member",
      "Privacy controls \u2014 share what you want, keep what you don't",
      "Shared, busy, and private event types",
    ],
    tagline: "Never double-book again.",
    cta: "What else can it do?",
  },
  {
    id: 4,
    image: onboardingSlideTasks,
    icon: "tasks",
    headline: "Smart Task Management",
    subtitle: "Delegate without the drama.",
    featureHighlights: [
      "Create tasks by voice or text \u2014 your choice",
      "Assign to family members with one tap",
      "The app sends the reminders so you don't nag",
      "Family members earn points for completing tasks",
    ],
    tagline: "Let the app do the nagging for you.",
    cta: "There's more!",
  },
  {
    id: 5,
    image: onboardingSlideMeals,
    icon: "meals",
    headline: "Meal Planning Made Easy",
    subtitle: "Answer \"What's for dinner?\" once and for all.",
    featureHighlights: [
      "Plan your weekly meals in minutes",
      "Browse recipe suggestions and ideas",
      "Auto-generate grocery lists from your meal plan",
      "The whole family can see what's coming up",
    ],
    tagline: "Less stress at dinnertime. More time together.",
    cta: "Keep going!",
  },
  {
    id: 6,
    image: onboardingSlideAi,
    icon: "ai",
    headline: "Your AI-Powered Assistant",
    subtitle: "Say it or type it. We'll handle the rest.",
    body: "Use voice or text \u2014 whatever's easier in the moment:",
    examples: [
      '"Remind me to sign the permission slip."',
      '"Add milk, eggs, and snacks to the grocery list."',
      '"Put soccer practice on the calendar."',
    ],
    micTip: "Tap the mic or just type it in:",
    tagline: "Voice & text notes \u2014 capture ideas instantly.",
    subtagline: "Save voice memos or quick text notes anytime. No thought lost.",
    cta: "One more thing...",
  },
  {
    id: 7,
    image: onboardingSlideFamily,
    icon: "family",
    headline: "Built for the Whole Family",
    subtitle: "Everyone connected. Everyone contributing.",
    featureHighlights: [
      "Invite your partner, kids, or extended family",
      "Teen dashboard with their own view",
      "Shared grocery lists and notes",
      "Dishwasher clean/dirty toggle \u2014 no more guessing",
      "Password vault \u2014 securely store and share passwords with family",
    ],
    tagline: "Your family command center.",
    emotional: "Because it really does take a village.",
    cta: "I'm ready!",
  },
  {
    id: 8,
    image: onboardingSlide4,
    headline: "We want you to try\nThe Mom App for free.",
    isPrimingA: true,
  },
  {
    id: 9,
    image: onboardingSlide4,
    headline: "We'll send you a reminder\nbefore your free trial ends.",
    isPrimingB: true,
  },
  {
    id: 10,
    image: onboardingSlide4,
    headline: "Start your 14-day FREE trial.",
    body: "You've unlocked a simpler way to manage:",
    features: ["Tasks", "Schedules", "Meals", "Family life"],
    tagline: "Try everything free for 14 days, then choose a plan.",
    isPricing: true,
  },
];

const iconMap: Record<string, any> = {
  calendar: Calendar,
  tasks: ListTodo,
  meals: UtensilsCrossed,
  ai: Sparkles,
  family: Users,
};

export function OnboardingFlow({ onComplete, onStartTrial, isLoading = false }: OnboardingFlowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<"individual" | "family">("family");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  
  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onStartTrial(selectedPlan, billingCycle);
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const getPrice = (plan: "individual" | "family") => {
    if (plan === "individual") {
      return billingCycle === "monthly" ? "$5.99" : "$59.99";
    }
    return billingCycle === "monthly" ? "$9.99" : "$99.99";
  };

  const getPeriod = () => {
    return billingCycle === "monthly" ? "/month" : "/year";
  };

  const IconComponent = slide.icon ? iconMap[slide.icon] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full">
        {!(slide as any).isPrimingA && !(slide as any).isPrimingB && (
          <div className="w-full max-h-[250px] mb-4 flex items-center justify-center">
            <img
              src={slide.image}
              alt={slide.headline}
              className="max-h-[230px] w-auto object-contain rounded-2xl shadow-lg"
            />
          </div>
        )}

        <div className="text-center space-y-3 flex-1 overflow-y-auto">
          {IconComponent && (
            <div className="flex items-center justify-center gap-2">
              <div className="bg-pink-100 rounded-full p-2">
                <IconComponent className="h-5 w-5 text-pink-500" />
              </div>
              {slide.subtitle && (
                <p className="text-sm text-pink-600 font-medium">{slide.subtitle}</p>
              )}
            </div>
          )}

          <h1 className="text-2xl font-bold text-gray-900">{slide.headline}</h1>

          {!slide.icon && slide.subtitle && (
            <p className="text-sm text-pink-600 font-medium">{slide.subtitle}</p>
          )}

          {slide.body && !slide.isPricing && (
            <p className="text-gray-600 whitespace-pre-line text-base">{slide.body}</p>
          )}

          {slide.reassurance && (
            <p className="text-base text-pink-600 font-medium italic">{slide.reassurance}</p>
          )}

          {slide.benefits && (
            <ul className="text-left space-y-2 mx-auto max-w-xs">
              {slide.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-pink-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700 text-base">{benefit}</span>
                </li>
              ))}
            </ul>
          )}

          {slide.featureHighlights && (
            <ul className="text-left space-y-2 mx-auto max-w-xs">
              {slide.featureHighlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-pink-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700 text-base">{highlight}</span>
                </li>
              ))}
            </ul>
          )}

          {slide.examples && (
            <div className="bg-gray-50 rounded-lg p-3 text-left space-y-1.5">
              {slide.examples.map((example, idx) => (
                <p key={idx} className="text-gray-600 italic text-base">{example}</p>
              ))}
            </div>
          )}

          {slide.micTip && (
            <div className="flex items-center justify-center gap-2 bg-pink-50 rounded-full px-4 py-2 mt-2">
              <span className="text-gray-700 text-sm">{slide.micTip}</span>
              <div className="bg-pink-500 rounded-full p-2">
                <Mic className="h-4 w-4 text-white" />
              </div>
            </div>
          )}

          {slide.tagline && !slide.isPricing && (
            <p className="font-semibold text-gray-800 text-base">{slide.tagline}</p>
          )}

          {slide.subtagline && (
            <p className="text-gray-500 text-sm">{slide.subtagline}</p>
          )}

          {slide.emotional && (
            <p className="text-pink-600 italic text-base">{slide.emotional}</p>
          )}

          {slide.trust && (
            <p className="text-sm text-gray-500">{slide.trust}</p>
          )}

          {(slide as any).isPrimingA && (
            <div className="space-y-6 py-2">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="w-28 h-28 bg-gradient-to-br from-pink-100 to-pink-200 rounded-3xl flex items-center justify-center shadow-lg">
                    <Gift className="h-14 w-14 text-pink-500" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">FREE</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-full px-5 py-2">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-green-700 font-semibold text-sm">No Payment Due Now</span>
                </div>
                <p className="text-gray-500 text-sm">Enter your card to start your 14-day trial.<br/>You won't be charged a thing today.</p>
              </div>
            </div>
          )}

          {(slide as any).isPrimingB && (
            <div className="space-y-6 py-2">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <Bell className="h-24 w-24 text-pink-200" strokeWidth={1.5} />
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-sm font-bold">1</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-full px-5 py-2">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-green-700 font-semibold text-sm">No Payment Due Now</span>
                </div>
                <p className="text-gray-500 text-sm">We'll remind you on day 13 so you can<br/>cancel before you're ever charged.</p>
              </div>
            </div>
          )}

          {(slide as any).isPricing && (
            <div className="space-y-3">
              {/* Timeline */}
              <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-0">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center shrink-0">
                      <Gift className="h-4 w-4 text-white" />
                    </div>
                    <div className="w-0.5 h-8 bg-gray-200 mt-1" />
                  </div>
                  <div className="pb-3">
                    <p className="font-semibold text-gray-900 text-sm">Today — Trial Starts</p>
                    <p className="text-xs text-gray-500">Unlock everything. Nothing charged.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center shrink-0">
                      <Bell className="h-4 w-4 text-white" />
                    </div>
                    <div className="w-0.5 h-8 bg-gray-200 mt-1" />
                  </div>
                  <div className="pb-3">
                    <p className="font-semibold text-gray-900 text-sm">Day 13 — Reminder Sent</p>
                    <p className="text-xs text-gray-500">We'll remind you your trial ends tomorrow.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center shrink-0">
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Day 14 — Billing Starts</p>
                    <p className="text-xs text-gray-500">Cancel anytime before. No guilt, no pressure.</p>
                  </div>
                </div>
              </div>

              {/* Billing toggle */}
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${billingCycle === "monthly" ? "border-pink-500 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-500"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all relative ${billingCycle === "yearly" ? "border-pink-500 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-500"}`}
                >
                  {billingCycle === "yearly" && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">2 MONTHS FREE</span>
                  )}
                  Yearly
                </button>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={`cursor-pointer transition-all ${selectedPlan === "individual" ? "ring-2 ring-pink-500 bg-pink-50" : "hover:bg-gray-50"}`}
                  onClick={() => setSelectedPlan("individual")}
                >
                  <CardContent className="p-4 text-center">
                    <h3 className="font-semibold text-gray-900 text-sm">Individual</h3>
                    <p className="text-2xl font-bold text-pink-500">{getPrice("individual")}</p>
                    <p className="text-xs text-gray-500">{getPeriod()}</p>
                    <p className="text-xs text-gray-600 mt-1">Perfect for just you</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-all relative ${selectedPlan === "family" ? "ring-2 ring-pink-500 bg-pink-50" : "hover:bg-gray-50"}`}
                  onClick={() => setSelectedPlan("family")}
                >
                  <div className="absolute -top-3 right-2 bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full z-10">Most Popular</div>
                  <CardContent className="p-4 pt-5 text-center">
                    <h3 className="font-semibold text-gray-900 text-sm">Family</h3>
                    <p className="text-2xl font-bold text-pink-500">{getPrice("family")}</p>
                    <p className="text-xs text-gray-500">{getPeriod()}</p>
                    <p className="text-xs text-gray-600 mt-1">Up to 6 members</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Check className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-green-700 font-semibold text-sm">No Payment Due Now</span>
              </div>
            </div>
          )}
        </div>

        <div className="w-full space-y-3 mt-4">
          <div className="flex justify-center gap-1.5 mb-3">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide ? "w-6 bg-pink-500" : "w-2 bg-gray-300"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={isLoading}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-6 text-lg disabled:opacity-50"
          >
            {isLoading
            ? "STARTING YOUR TRIAL..."
            : isLastSlide
            ? "START MY 14-DAY FREE TRIAL"
            : (slide as any).isPrimingA
            ? "Continue for Free"
            : (slide as any).isPrimingB
            ? "Sounds Good!"
            : slide.cta}
            {!isLoading && <ChevronRight className="ml-2 h-5 w-5" />}
          </Button>

          {currentSlide > 0 && (
            <Button
              variant="ghost"
              onClick={handlePrev}
              className="w-full text-gray-500"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}

          {isLastSlide && (
            <p className="text-center text-sm text-gray-600 font-medium">
              Mom Life. Made Easy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
