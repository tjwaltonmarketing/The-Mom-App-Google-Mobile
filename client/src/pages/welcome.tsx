import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl, setAuthToken } from "@/lib/config";
import { logFBEvent, FB_EVENTS } from "@/lib/facebook-events";
import { Calendar, UtensilsCrossed, CheckCircle2 } from "lucide-react";
import { SiApple } from "react-icons/si";
import { Capacitor } from "@capacitor/core";
import logoPath from "@assets/The_Mom_app_-_New_Tagline_-_Cropped_1775943647566.png";
import beforeAfterPath from "@assets/The_Mom_app_(4)_1766014201419.png";

declare global {
  interface Window {
    google?: any;
    AppleID?: any;
  }
}

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAndroid = Capacitor.getPlatform() === "android";
  const isNative = Capacitor.isNativePlatform();

  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

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
          setLocation("/finish-profile");
        } else {
          logFBEvent(FB_EVENTS.COMPLETE_REGISTRATION);
          setLocation("/");
        }
      }
    },
    onError: () => {
      toast({ title: "Google Sign-In Failed", description: "Could not sign in with Google. Please try again.", variant: "destructive" });
    },
  });

  const appleLoginMutation = useMutation({
    mutationFn: async (data: { identityToken: string; firstName?: string; lastName?: string }) => {
      const response = await apiRequest("POST", "/api/auth/apple", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.token) setAuthToken(data.token);
      if (data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        if (!data.user.phoneNumber) {
          setLocation("/finish-profile");
        } else {
          logFBEvent(FB_EVENTS.COMPLETE_REGISTRATION);
          setLocation("/");
        }
      }
    },
    onError: () => {
      toast({ title: "Apple Sign-In Failed", description: "Could not sign in with Apple. Please try again.", variant: "destructive" });
    },
  });

  const handleAppleSignIn = useCallback(async () => {
    try {
      if (isNative) {
        // Native iOS: use the custom AppleSignInPlugin (ASAuthorizationAppleIDProvider)
        const { registerPlugin } = await import("@capacitor/core");
        interface AppleSignInPlugin {
          signIn(): Promise<{ identityToken: string; firstName?: string; lastName?: string; email?: string }>;
        }
        const AppleSignIn = registerPlugin<AppleSignInPlugin>("AppleSignInPlugin");
        const result = await AppleSignIn.signIn();
        if (!result.identityToken) throw new Error("No identity token returned");
        appleLoginMutation.mutate({ identityToken: result.identityToken, firstName: result.firstName, lastName: result.lastName });
        return;
      }

      // Web: use Apple JS SDK popup
      const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;
      if (!appleClientId) {
        toast({ title: "Apple Sign-In Not Configured", description: "Apple Sign-In requires setup in Apple Developer Portal. Please use Google or email instead.", variant: "destructive" });
        return;
      }
      if (!window.AppleID) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Apple SDK"));
          document.head.appendChild(script);
        });
      }
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: "name email",
        redirectURI: window.location.origin,
        usePopup: true,
      });
      const response = await window.AppleID.auth.signIn();
      const identityToken = response?.authorization?.id_token;
      if (!identityToken) throw new Error("No identity token returned");
      const firstName = response?.user?.name?.firstName;
      const lastName = response?.user?.name?.lastName;
      appleLoginMutation.mutate({ identityToken, firstName, lastName });
    } catch (err: any) {
      console.error("[AppleSignIn] error:", JSON.stringify(err), err?.message, err?.code);
      if (err?.error !== "popup_closed_by_user" && err?.message !== "canceled") {
        const detail = err?.message || err?.error || "Unknown error";
        toast({ title: "Apple Sign-In Failed", description: detail, variant: "destructive" });
      }
    }
  }, [appleLoginMutation, toast, isNative]);

  const handleGoogleCallback = useCallback(
    (response: any) => { if (response.credential) googleLoginMutation.mutate(response.credential); },
    [googleLoginMutation]
  );

  useEffect(() => {
    if (!googleClientId) return;
    const initGoogle = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCallback });
    };
    if (window.google?.accounts?.id) { initGoogle(); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true; script.defer = true; script.onload = initGoogle;
    document.head.appendChild(script);
    return () => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) document.head.removeChild(existing);
    };
  }, [googleClientId, handleGoogleCallback]);

  return (
    <div className="welcome-bg min-h-screen flex items-center justify-center px-4 py-8" style={{ fontFamily: "'Poppins', sans-serif", paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>

      {/* Two-column layout on desktop, single card on mobile */}
      <div className="flex flex-col md:flex-row items-center md:items-stretch gap-8 w-full max-w-5xl">

        {/* LEFT — signup card */}
        <div className="welcome-card-left bg-white rounded-3xl shadow-xl w-full md:max-w-sm flex-shrink-0">
          <div className="px-7 py-7 flex flex-col items-center gap-5">
            {/* Logo */}
            <img src={logoPath} alt="The Mom App" className="h-[75px] w-auto" />

            {/* Headline + subhead */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">Finally.<br />Share the Family Load.</h1>
              <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                Includes AI Powered Assistant
              </p>
            </div>

            {/* Benefit bullets */}
            <div className="w-full space-y-2">
              <div className="welcome-benefit-card flex items-center gap-3 bg-pink-50 border border-pink-100 rounded-xl px-4 py-3">
                <div className="bg-pink-500 rounded-lg p-2 flex-shrink-0">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-800 leading-snug">No more holding the family calendar in your head</p>
              </div>
              <div className="welcome-benefit-card flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                <div className="bg-purple-500 rounded-lg p-2 flex-shrink-0">
                  <UtensilsCrossed className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-800 leading-snug">Meals planned, groceries listed — automatically</p>
              </div>
              <div className="welcome-benefit-card flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                <div className="bg-rose-400 rounded-lg p-2 flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-800 leading-snug">Share tasks. Everyone does their part. You finally breathe.</p>
              </div>
            </div>

            {/* Sign-in buttons */}
            <div className="w-full space-y-3">
              {/* Google — uses JS SDK on web; server-side redirect on native (iOS + Android) */}
              <button
                onClick={() => {
                  if (isNative) {
                    // Generate a state token so the app can poll for the auth result on resume
                    const state = Math.random().toString(36).slice(2, 18);
                    localStorage.setItem("google_oauth_state", state);
                    localStorage.setItem("google_oauth_state_time", Date.now().toString());
                    window.location.href = getApiUrl(`/api/auth/google/redirect?state=${state}`);
                  } else if (window.google?.accounts?.id) {
                    window.google.accounts.id.prompt();
                  } else {
                    toast({ title: "Google Sign-In unavailable", description: "Please use email sign-in or try again.", variant: "destructive" });
                  }
                }}
                disabled={googleLoginMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm py-[11px] rounded-md border border-gray-300 transition-colors shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
                  <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957A8.996 8.996 0 000 9.002a8.996 8.996 0 00.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.48 0 2.438 2.017.956 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                </svg>
                {googleLoginMutation.isPending ? "Signing in..." : "Continue with Google"}
              </button>

              {/* Apple — not supported on Android */}
              {!isAndroid && (
                <button
                  onClick={handleAppleSignIn}
                  disabled={appleLoginMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-900 text-white font-medium text-sm py-[11px] rounded-md border border-gray-300 transition-colors"
                >
                  <SiApple className="h-4 w-4" />
                  {appleLoginMutation.isPending ? "Signing in..." : "Continue with Apple"}
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Trial CTA */}
            <Button
              onClick={() => setLocation("/register")}
              className="welcome-cta w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold text-base py-6 rounded-xl shadow-md"
            >
              Start My Free 14-Day Trial
            </Button>

            {/* Sign in + invite — grouped so they sit close together */}
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm text-gray-900">
                Already have an account?{" "}
                <button onClick={() => setLocation("/login")} className="text-pink-500 font-semibold hover:underline">Sign In</button>
              </p>
              <p className="text-sm text-gray-900">
                Got a family invite?{" "}
                <button onClick={() => setLocation("/login")} className="text-pink-500 font-semibold hover:underline">Click here</button>
              </p>
            </div>

            {/* Legal */}
            <p className="text-xs text-gray-400 text-center -mt-2">
              No commitment • Cancel anytime •{" "}
              <button onClick={() => setLocation("/terms")} className="underline">Terms</button>
              {" · "}
              <button onClick={() => setLocation("/privacy")} className="underline">Privacy</button>
            </p>
          </div>
        </div>

        {/* RIGHT — before/after image (desktop only) */}
        <div className="welcome-card-right hidden md:flex flex-col justify-center flex-1 bg-white rounded-3xl shadow-xl px-8 py-8 gap-5">
          <div className="text-center">
            <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest mb-1">✨ AI-Powered Family Organizer</p>
            <h2 className="text-4xl font-bold text-gray-900 leading-tight">Mom Life.<br /><span className="text-pink-500">Made Easy.</span></h2>
            <p className="text-gray-500 text-sm mt-3 leading-relaxed">
              Reduce your mental load with AI voice assistance. Manage your family's calendar, tasks, meals, notes, and more — all in one place.
            </p>
          </div>
          <img
            src={beforeAfterPath}
            alt="Before and After The Mom App"
            className="w-full rounded-2xl shadow-md object-cover"
          />
        </div>

      </div>
    </div>
  );
}
