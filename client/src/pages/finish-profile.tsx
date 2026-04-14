import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { logFBEvent, FB_EVENTS } from "@/lib/facebook-events";
import logoPath from "@assets/The_Mom_app_-_New_Tagline_-_Cropped_1775943647566.png";

export default function FinishProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [phone, setPhone] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [familyError, setFamilyError] = useState("");

  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: family, isLoading: familyLoading } = useQuery<any>({
    queryKey: ["/api/family"],
    enabled: !!user,
    retry: false,
  });

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
      return;
    }
    if (user && family && !familyLoading) {
      const hasPhone = !!user.phoneNumber;
      const hasRealFamilyName = family?.name && family.name !== "My Family" && family.name !== "";
      if (hasPhone && hasRealFamilyName) {
        setLocation("/");
      } else {
        if (user.phoneNumber) setPhone(user.phoneNumber);
        if (family?.name && family.name !== "My Family") setFamilyName(family.name);
      }
    }
  }, [user, family, userLoading, familyLoading, setLocation]);

  const hasRealFamilyName = family?.name && family.name !== "My Family" && family.name !== "";

  const phoneMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await apiRequest("POST", "/api/auth/set-phone", { phoneNumber });
      return res.json();
    },
  });

  const familyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("PATCH", "/api/family", { name });
      return res.json();
    },
  });

  const handleSubmit = async () => {
    let valid = true;
    // Phone is required only for new users (no real family name yet)
    if (!phone.trim() && !hasRealFamilyName) {
      setPhoneError("Please enter your phone number");
      valid = false;
    } else {
      setPhoneError("");
    }
    if (!familyName.trim()) {
      setFamilyError("Please enter your family name");
      valid = false;
    } else {
      setFamilyError("");
    }
    if (!valid) return;

    try {
      const tasks: Promise<any>[] = [];
      if (phone.trim()) tasks.push(phoneMutation.mutateAsync(phone.trim()));
      if (familyName.trim()) tasks.push(familyMutation.mutateAsync(familyName.trim()));
      await Promise.all(tasks);
      logFBEvent(FB_EVENTS.COMPLETE_REGISTRATION);
      queryClient.setQueryData(["/api/auth/user"], (old: any) =>
        old ? { ...old, phoneNumber: phone.trim() || old.phoneNumber } : old
      );
      queryClient.setQueryData(["/api/family"], (old: any) =>
        old ? { ...old, name: familyName.trim() } : old
      );
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      setLocation("/");
    } catch {
      toast({ title: "Error", description: "Could not save your details. Please try again.", variant: "destructive" });
    }
  };

  const isSubmitting = phoneMutation.isPending || familyMutation.isPending;

  if (userLoading || familyLoading) {
    return (
      <div className="welcome-bg min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="welcome-bg min-h-screen flex items-center justify-center px-4 py-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="welcome-card-left bg-white rounded-3xl shadow-xl w-full max-w-md px-6 py-8">
        <div className="flex justify-center mb-4">
          <img src={logoPath} alt="The Mom App" className="h-[75px] object-contain" />
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">How should we address your family?</h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          Tell us a bit more so we can set up your family hub.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Family Name <span className="text-pink-500">*</span>
            </label>
            <Input
              placeholder="e.g. Smith Family"
              value={familyName}
              onChange={(e) => { setFamilyName(e.target.value); setFamilyError(""); }}
              className={familyError ? "border-red-400 focus-visible:ring-red-300" : ""}
            />
            {familyError && <p className="text-xs text-red-500 mt-1">{familyError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number {hasRealFamilyName ? <span className="text-gray-400 font-normal">(optional)</span> : <span className="text-pink-500">*</span>}
            </label>
            <Input
              type="tel"
              placeholder="e.g. +1 (555) 123-4567"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
              className={phoneError ? "border-red-400 focus-visible:ring-red-300" : ""}
            />
            {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
            <p className="text-xs text-gray-400 mt-1">
              Used for password resets and important account updates. We will never share your info with third parties.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full mt-6 bg-pink-500 hover:bg-pink-600 text-white py-6 text-base font-semibold"
        >
          {isSubmitting ? "Saving..." : "Let's Get Started →"}
        </Button>

        {hasRealFamilyName && (
          <button
            onClick={() => setLocation("/")}
            className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Skip for now
          </button>
        )}

        <p className="text-xs text-center text-gray-400 mt-4">
          You can update these anytime in Settings.
        </p>
      </div>
    </div>
  );
}
