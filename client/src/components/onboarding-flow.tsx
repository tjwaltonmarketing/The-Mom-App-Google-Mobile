import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronRight, ChevronLeft, Mic } from "lucide-react";
import onboardingSlide1 from "@/assets/images/onboarding-slide-1.png";
import onboardingSlide2 from "@/assets/images/onboarding-slide-2.png";
import onboardingSlide3 from "@/assets/images/onboarding-slide-3.png";
import onboardingSlide4 from "@/assets/images/onboarding-slide-4.png";

interface OnboardingFlowProps {
  onComplete: (plan?: "individual" | "family") => void;
  onStartTrial: (plan: "individual" | "family") => void;
  isLoading?: boolean;
}

const slides = [
  {
    id: 1,
    image: onboardingSlide1,
    headline: "🎉 You're officially in, Mama.",
    body: "Welcome to The Mom App, where the mental load gets lighter and life gets easier.\n\nYou just took the first step toward fewer reminders in your head, more help from the family, and more calm in your day.",
    reassurance: "No judgment. No perfection. Just support.",
    cta: "Let's make mom life easier",
  },
  {
    id: 2,
    image: onboardingSlide2,
    headline: "Everything you juggle. One place.",
    benefits: [
      "Get tasks out of your head",
      "Keep family schedules organized",
      "Plan meals without the stress",
      "Remember everything without remembering everything",
      "Finally get help without the nagging",
    ],
    tagline: "Less overwhelm. More peace.",
    emotional: "Because your brain deserves a break too.",
    cta: "Show me how it works",
  },
  {
    id: 3,
    image: onboardingSlide3,
    headline: "Just say it. We'll handle the rest.",
    body: "Talk to The Mom App like you'd talk to yourself:",
    examples: [
      '"Remind me to sign the permission slip."',
      '"Add milk, eggs, and snacks to the grocery list."',
      '"Put soccer practice on the calendar."',
    ],
    micTip: "Just tap the microphone icon to get started:",
    tagline: "We turn your words into tasks, lists, and plans instantly.",
    subtagline: "No typing. No digging. No mental clutter.",
    trust: "Built for real moms with real chaos.",
    cta: "Try it now",
  },
  {
    id: 4,
    image: onboardingSlide4,
    headline: "Start your 14-day free trial",
    trialBadge: "No credit card required",
    body: "You've unlocked a simpler way to manage:",
    features: ["Tasks", "Schedules", "Meals", "Family life"],
    tagline: "Try everything free for 14 days, then choose a plan.",
    isPricing: true,
  },
];

export function OnboardingFlow({ onComplete, onStartTrial, isLoading = false }: OnboardingFlowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<"individual" | "family">("family");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  
  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onStartTrial(selectedPlan);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full">
        <div className="w-full max-h-[300px] mb-6 flex items-center justify-center">
          <img
            src={slide.image}
            alt={slide.headline}
            className="max-h-[280px] w-auto object-contain rounded-2xl shadow-lg"
          />
        </div>

        <div className="text-center space-y-4 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{slide.headline}</h1>

          {slide.body && !slide.isPricing && (
            <p className="text-gray-600 whitespace-pre-line">{slide.body}</p>
          )}

          {slide.reassurance && (
            <p className="text-sm text-pink-600 font-medium italic">{slide.reassurance}</p>
          )}

          {slide.benefits && (
            <ul className="text-left space-y-2 mx-auto max-w-xs">
              {slide.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-pink-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          )}

          {slide.examples && (
            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
              {slide.examples.map((example, idx) => (
                <p key={idx} className="text-gray-600 italic text-sm">{example}</p>
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
            <p className="font-semibold text-gray-800">{slide.tagline}</p>
          )}

          {slide.subtagline && (
            <p className="text-gray-500 text-sm">{slide.subtagline}</p>
          )}

          {slide.emotional && (
            <p className="text-pink-600 italic">{slide.emotional}</p>
          )}

          {slide.trust && (
            <p className="text-sm text-gray-500">{slide.trust}</p>
          )}

          {slide.isPricing && (
            <div className="space-y-4">
              {slide.trialBadge && (
                <div className="inline-block bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-medium">
                  {slide.trialBadge}
                </div>
              )}
              <p className="text-gray-600">{slide.body}</p>
              
              {slide.features && (
                <div className="flex flex-wrap justify-center gap-2">
                  {slide.features.map((feature, idx) => (
                    <span key={idx} className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm">
                      {feature}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-gray-700 font-medium">{slide.tagline}</p>

              <div className="flex justify-center gap-2 mb-4">
                <Button
                  variant={billingCycle === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBillingCycle("monthly")}
                  className={billingCycle === "monthly" ? "bg-pink-500 hover:bg-pink-600" : ""}
                >
                  Monthly
                </Button>
                <Button
                  variant={billingCycle === "yearly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBillingCycle("yearly")}
                  className={billingCycle === "yearly" ? "bg-pink-500 hover:bg-pink-600" : ""}
                >
                  Yearly (2 months free)
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card 
                  className={`cursor-pointer transition-all ${selectedPlan === "individual" ? "ring-2 ring-pink-500 bg-pink-50" : "hover:bg-gray-50"}`}
                  onClick={() => setSelectedPlan("individual")}
                >
                  <CardContent className="p-4 text-center">
                    <h3 className="font-semibold text-gray-900">Individual</h3>
                    <p className="text-2xl font-bold text-pink-500">{getPrice("individual")}</p>
                    <p className="text-xs text-gray-500">{getPeriod()}</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all relative ${selectedPlan === "family" ? "ring-2 ring-pink-500 bg-pink-50" : "hover:bg-gray-50"}`}
                  onClick={() => setSelectedPlan("family")}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Most Popular
                  </div>
                  <CardContent className="p-4 text-center">
                    <h3 className="font-semibold text-gray-900">Family</h3>
                    <p className="text-2xl font-bold text-pink-500">{getPrice("family")}</p>
                    <p className="text-xs text-gray-500">{getPeriod()}</p>
                    <p className="text-xs text-gray-600 mt-1">Up to 6 members</p>
                  </CardContent>
                </Card>
              </div>

              <p className="text-sm text-gray-600 italic mt-4">
                Cancel anytime. No guilt. No pressure.
              </p>
            </div>
          )}
        </div>

        <div className="w-full space-y-3 mt-6">
          <div className="flex justify-center gap-2 mb-4">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide ? "w-8 bg-pink-500" : "w-2 bg-gray-300"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={isLoading}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-6 text-lg disabled:opacity-50"
          >
            {isLoading ? "STARTING YOUR TRIAL..." : isLastSlide ? "START MY 14-DAY FREE TRIAL" : slide.cta}
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
