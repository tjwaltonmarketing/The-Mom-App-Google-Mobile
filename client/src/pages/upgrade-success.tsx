import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, PartyPopper } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function UpgradeSuccess() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const sessionId = new URLSearchParams(search).get("session_id");

  const verifyMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("GET", `/api/checkout/verify/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    },
  });

  useEffect(() => {
    if (sessionId && !verifyMutation.isPending && !verifyMutation.isSuccess && !verifyMutation.isError) {
      verifyMutation.mutate(sessionId);
    }
  }, [sessionId]);

  if (verifyMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-center px-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <Loader2 className="h-12 w-12 text-pink-500 animate-spin mb-4" />
        <p className="text-gray-600">Confirming your subscription...</p>
      </div>
    );
  }

  if (verifyMutation.isError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-center px-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div className="max-w-md w-full text-center space-y-6">
          <p className="text-gray-600">There was an issue confirming your subscription. Please contact support if the problem persists.</p>
          <Button onClick={() => setLocation("/")} className="bg-pink-500 hover:bg-pink-600">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-center px-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative inline-block">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <PartyPopper className="absolute -top-2 -right-2 h-8 w-8 text-yellow-500" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to the Family!
        </h1>

        <p className="text-gray-600">
          Your subscription is now active. You have full access to all The Mom App features.
        </p>

        <div className="bg-pink-50 rounded-lg p-6 text-left space-y-3">
          <h3 className="font-semibold text-gray-900">What's next?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              Set up your family members in Settings
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              Try the AI voice assistant for quick task creation
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              Invite your teens for gamified task management
            </li>
          </ul>
        </div>

        <Button 
          onClick={() => setLocation("/")} 
          className="w-full py-6 text-lg bg-pink-500 hover:bg-pink-600 text-white"
        >
          START USING THE MOM APP
        </Button>
      </div>
    </div>
  );
}
