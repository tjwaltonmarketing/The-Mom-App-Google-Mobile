import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { ShareModal } from "@/components/share-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import {
  isRevenueCatAvailable,
  initRevenueCat,
  revenueCatLogIn,
  getOfferings,
  purchaseProduct,
  getPackageForPlan,
  lastInitError,
  type RCPackage,
} from "@/services/revenuecat";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(
    () => localStorage.getItem("pending_share_claim") === "true"
  );
  const [rcPackages, setRcPackages] = useState<RCPackage[]>([]);
  const [rcLoading, setRcLoading] = useState(false);
  const [rcPurchasing, setRcPurchasing] = useState(false);

  const isAndroid = Capacitor.getPlatform() === "android";
  const isIOS = Capacitor.getPlatform() === "ios";
  const isNative = isAndroid || isIOS;

  const { data: authUser } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Initialize RevenueCat immediately on native — offerings work anonymously
  useEffect(() => {
    if (!isNative || !isRevenueCatAvailable()) return;
    setRcLoading(true);
    initRevenueCat()
      .then(async (ok) => {
        if (!ok) {
          console.warn("[Onboarding] RevenueCat init failed");
          return;
        }
        const pkgs = await getOfferings();
        console.log("[Onboarding] RC packages loaded:", pkgs.length);
        setRcPackages(pkgs);
      })
      .catch((e) => console.error("[Onboarding] RC init error:", e))
      .finally(() => setRcLoading(false));
  }, [isNative]);

  // Log in to RevenueCat once we have the user ID
  useEffect(() => {
    if (!isNative || !isRevenueCatAvailable()) return;
    const user = authUser as any;
    if (user?.id) {
      revenueCatLogIn(String(user.id)).catch(console.error);
    }
  }, [isNative, authUser]);

  const showShare = () => {
    localStorage.setItem("pending_share_claim", "true");
    setShowShareModal(true);
  };

  const clearShare = () => {
    localStorage.removeItem("pending_share_claim");
  };

  const handleNativePurchase = async (plan: "individual" | "family", interval: "monthly" | "yearly") => {
    let packages = rcPackages;

    // If packages aren't loaded yet, try to init + fetch now
    if (packages.length === 0) {
      setRcLoading(true);
      try {
        const ok = await initRevenueCat();
        if (ok) {
          packages = await getOfferings();
          setRcPackages(packages);
          console.log("[Onboarding] Retry RC packages:", packages.length);
        }
      } catch (e) {
        console.error("[Onboarding] Retry RC error:", e);
      } finally {
        setRcLoading(false);
      }
    }

    const pkg = getPackageForPlan(packages, plan, interval);
    if (!pkg) {
      const available = packages.map(p => p.productIdentifier).join(", ") || "none";
      const errDetail = lastInitError ? ` Init: ${lastInitError}` : ` ${packages.length} pkgs: ${available}`;
      console.warn("[Onboarding] No package found for", plan, interval, "available:", available);
      toast({
        title: "Product unavailable",
        description: `Not available right now.${errDetail}`,
        variant: "destructive",
      });
      return;
    }

    setRcPurchasing(true);
    try {
      const result = await purchaseProduct(pkg.productIdentifier);
      if (result.cancelled) {
        setRcPurchasing(false);
        return;
      }
      if (result.success) {
        const endpoint = isAndroid
          ? "/api/subscription/google-purchase"
          : "/api/subscription/apple-purchase";
        await apiRequest("POST", endpoint, {
          productIdentifier: pkg.productIdentifier,
          plan,
          interval,
          activeEntitlements: result.customerInfo?.activeEntitlements || [],
          expirationDate: result.customerInfo?.latestExpirationDate,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        localStorage.setItem("onboarding_completed", "true");
        toast({
          title: "Welcome to The Mom App!",
          description: "Your free trial has started. You won't be charged until it ends.",
        });
        window.location.href = "/";
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

  const startTrialMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: "individual" | "family"; interval: "monthly" | "yearly" }) => {
      // Web — create Stripe checkout session with 14-day trial
      const pendingCoupon = localStorage.getItem('pendingCoupon') || undefined;
      const response = await apiRequest("POST", "/api/checkout/create-session", { plan, interval, trialDays: 14, coupon: pendingCoupon });
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data?.url) {
        // Redirect to Stripe — do NOT set onboarding_completed yet.
        // It will be set in upgrade-success once the subscription is verified.
        localStorage.removeItem("pendingCoupon");
        window.location.href = data.url;
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        localStorage.setItem("onboarding_completed", "true");
        toast({ title: "Welcome to The Mom App!", description: "Your free trial has started." });
        window.location.href = "/";
      }
    },
    onError: (error: any) => {
      console.error("Start trial error:", error);
      toast({ title: "Something went wrong", description: "Could not start your trial. Please try again.", variant: "destructive" });
    },
  });

  const handleStartTrial = (plan: "individual" | "family", interval: "monthly" | "yearly") => {
    if (isNative) {
      handleNativePurchase(plan, interval);
    } else {
      startTrialMutation.mutate({ plan, interval });
    }
  };

  const shareMutation = useMutation({
    mutationFn: async (platform: "facebook" | "instagram" | "skip") => {
      const response = await apiRequest("POST", "/api/referral/share", { platform });
      return response.json();
    },
    onSuccess: (data: any) => {
      clearShare();
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      localStorage.setItem("onboarding_completed", "true");
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
      window.location.href = "/";
    },
    onError: () => {
      clearShare();
      localStorage.setItem("onboarding_completed", "true");
      toast({
        title: "Welcome to The Mom App!",
        description: "Your 14-day free trial has started.",
      });
      window.location.href = "/";
    },
  });

  const handleShare = (platform: "facebook" | "instagram") => {
    shareMutation.mutate(platform);
  };

  const handleSkip = () => {
    clearShare();
    apiRequest("POST", "/api/referral/share", { platform: "skip" }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    localStorage.setItem("onboarding_completed", "true");
    toast({
      title: "Welcome to The Mom App!",
      description: "Your free trial has started.",
    });
    window.location.href = "/";
  };

  const handleComplete = () => {
    setLocation("/");
  };

  if (showShareModal && !isNative) {
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
      isLoading={rcPurchasing || startTrialMutation.isPending || rcLoading}
    />
  );
}
