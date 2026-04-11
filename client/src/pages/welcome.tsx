import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl, setAuthToken } from "@/lib/config";
import { logFBEvent, FB_EVENTS } from "@/lib/facebook-events";
import { CalendarDays, CheckSquare, Brain } from "lucide-react";
import logoPath from "@assets/The_Mom_app_(5)_1766014062224.png";

declare global {
  interface Window {
    google?: any;
  }
}

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    document.documentElement.classList.remove("dark", "blue-light-filter");
    localStorage.setItem("mom-app-theme", "light");
  }, []);

  useEffect(() => {
    fetch(getApiUrl("/api/config/google-client-id"))
      .then((res) => res.json())
      .then((data) => { if (data?.clientId) setGoogleClientId(data.clientId); })
      .catch(() => {});
  }, []);

  const googleLoginMutation = useMutation({
    mutationFn: async (credential: string) => {
      const response = await apiRequest("POST", "/api/auth/google", { credential });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.token) setAuthToken(data.token);
      if (data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        if (!data.user.phoneNumber) {
          setShowPhoneModal(true);
        } else {
          logFBEvent(FB_EVENTS.COMPLETE_REGISTRATION);
          setLocation("/");
        }
      }
    },
    onError: () => {
      toast({
        title: "Google Sign-In Failed",
        description: "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
    },
  });

  const phoneUpdateMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest("POST", "/api/auth/set-phone", { phoneNumber: phone });
      return await response.json();
    },
    onSuccess: () => {
      logFBEvent(FB_EVENTS.COMPLETE_REGISTRATION);
      setShowPhoneModal(false);
      setLocation("/");
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save phone number.", variant: "destructive" });
    },
  });

  const handleGoogleCallback = useCallback(
    (response: any) => {
      if (response.credential) googleLoginMutation.mutate(response.credential);
    },
    [googleLoginMutation]
  );

  useEffect(() => {
    if (!googleClientId) return;
    const initGoogle = () => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCallback });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: googleButtonRef.current.offsetWidth || 320,
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "center",
      });
    };

    if (window.google?.accounts?.id) { initGoogle(); return; }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
    return () => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) document.head.removeChild(existing);
    };
  }, [googleClientId, handleGoogleCallback]);

  const handlePhoneSubmit = () => {
    if (!phoneNumber.trim()) {
      setPhoneError("Please enter your phone number");
      return;
    }
    setPhoneError("");
    phoneUpdateMutation.mutate(phoneNumber.trim());
  };

  const handleSkipPhone = () => {
    logFBEvent(FB_EVENTS.COMPLETE_REGISTRATION);
    setShowPhoneModal(false);
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-pink-50 flex flex-col items-center justify-center px-6 py-8" style={{ fontFamily: "'Poppins', sans-serif" }}>

      {/* Phone number modal after Google sign-in */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-1">One last thing</h2>
            <p className="text-sm text-gray-500 mb-4">
              We use your phone number for important family notifications. You can update this anytime in Settings.
            </p>
            <Input
              type="tel"
              placeholder="Phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mb-2 text-base"
              onKeyDown={(e) => { if (e.key === "Enter") handlePhoneSubmit(); }}
            />
            {phoneError && <p className="text-red-500 text-xs mb-2">{phoneError}</p>}
            <Button
              onClick={handlePhoneSubmit}
              disabled={phoneUpdateMutation.isPending}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-xl mb-2"
            >
              {phoneUpdateMutation.isPending ? "Saving..." : "Continue"}
            </Button>
            <button
              onClick={handleSkipPhone}
              className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo */}
        <img src={logoPath} alt="The Mom App" className="h-28 w-auto" />

        {/* Headline */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">Mom Life.<br />Made Easy.</h1>
          <p className="text-gray-500 text-sm mt-2">Your family's command center — all in one place.</p>
        </div>

        {/* Benefits */}
        <div className="w-full space-y-3">
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-pink-100">
            <div className="bg-pink-100 rounded-lg p-2">
              <CalendarDays className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Smart Family Calendar</p>
              <p className="text-xs text-gray-500">Shared, private & busy events with Google sync</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-pink-100">
            <div className="bg-purple-100 rounded-lg p-2">
              <CheckSquare className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Tasks, Meals & Grocery Lists</p>
              <p className="text-xs text-gray-500">Assign chores to kids with points & rewards</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-pink-100">
            <div className="bg-rose-100 rounded-lg p-2">
              <Brain className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">AI Voice Assistant</p>
              <p className="text-xs text-gray-500">Speak tasks, events & reminders into existence</p>
            </div>
          </div>
        </div>

        {/* Google Sign-In */}
        <div className="w-full">
          <div
            ref={googleButtonRef}
            className="w-full"
            style={{ minHeight: 44 }}
          />
          {!googleClientId && (
            <div className="h-11 w-full rounded-lg bg-gray-100 animate-pulse" />
          )}
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email trial CTA */}
        <Button
          onClick={() => setLocation("/register")}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold text-base py-6 rounded-xl shadow-md"
        >
          Start My Free 14-Day Trial
        </Button>

        {/* Sign in link */}
        <p className="text-sm text-gray-400">
          Already have an account?{" "}
          <button
            onClick={() => setLocation("/login")}
            className="text-pink-500 font-semibold hover:underline"
          >
            Sign In
          </button>
        </p>

        {/* Legal */}
        <p className="text-xs text-gray-400 text-center mt-2">
          No credit card required. Cancel anytime.{" "}
          <button onClick={() => setLocation("/terms")} className="underline">Terms</button>
          {" · "}
          <button onClick={() => setLocation("/privacy")} className="underline">Privacy</button>
        </p>
      </div>
    </div>
  );
}
