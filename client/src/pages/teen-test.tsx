import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteTeenModal } from "@/components/family/invite-teen-modal";
import { TeenOnboarding } from "@/components/teen/teen-onboarding";
import { TeenDashboard } from "@/components/teen/teen-dashboard";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, Trophy, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

function SMSProviderStatus() {
  const { data: smsProviders, isLoading } = useQuery({
    queryKey: ["/api/sms/providers"],
    retry: false,
  });

  if (isLoading) {
    return <div className="mt-2 text-xs text-gray-500">Checking SMS providers...</div>;
  }

  return (
    <div className="mt-2 text-xs">
      {smsProviders?.configured ? (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          SMS active via: {smsProviders.providers.join(", ")}
        </div>
      ) : (
        <div className="flex items-center gap-1 text-amber-600">
          <XCircle className="h-3 w-3" />
          No SMS providers configured
        </div>
      )}
    </div>
  );
}

export default function TeenTest() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [viewMode, setViewMode] = useState<"testing" | "teen-dashboard">("testing");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Teen Account System Testing</h1>
        <p className="text-gray-600">
          Test the invite system, onboarding flow, and teen dashboard
        </p>
        
        <div className="flex justify-center gap-2">
          <Button
            variant={viewMode === "testing" ? "default" : "outline"}
            onClick={() => setViewMode("testing")}
          >
            Testing Interface
          </Button>
          <Button
            variant={viewMode === "teen-dashboard" ? "default" : "outline"}
            onClick={() => setViewMode("teen-dashboard")}
          >
            Teen Dashboard
          </Button>
        </div>
      </div>

      {viewMode === "testing" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Parent Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Parent Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Invite Teen to Family</h4>
                <p className="text-sm text-gray-600">
                  Create invite codes and send them to teens via SMS or email
                </p>
                <Button onClick={() => setShowInviteModal(true)} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Teen Invite
                </Button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">SMS Testing:</h5>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Click "Create Teen Invite" above</li>
                  <li>Choose "Text Message" and enter a phone number</li>
                  <li>Click "Send via Text" to send real SMS</li>
                  <li>Check your phone for the invitation message!</li>
                </ol>
                <SMSProviderStatus />
              </div>
            </CardContent>
          </Card>

          {/* Teen Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teen Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Teen Onboarding</h4>
                <p className="text-sm text-gray-600">
                  Complete the sign-up flow with invite code
                </p>
                <Button onClick={() => setShowOnboarding(true)} className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Start Teen Onboarding
                </Button>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h5 className="font-medium text-green-900 mb-2">Features to Test:</h5>
                <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                  <li>Invite code validation</li>
                  <li>Profile creation with color picker</li>
                  <li>Notification preferences setup</li>
                  <li>Account creation completion</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Smart Notifications */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Smart Notification System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h5 className="font-medium text-yellow-900 mb-2">Progressive Reminders</h5>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>✓ Gentle start: "Don't forget..."</li>
                    <li>✓ Getting urgent: "Due soon..."</li>
                    <li>✓ Overdue: "Parents might ask..."</li>
                  </ul>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h5 className="font-medium text-purple-900 mb-2">Smart Features</h5>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>✓ Quiet hours (no sleep interruptions)</li>
                    <li>✓ Cooldown periods (no spam)</li>
                    <li>✓ Context-aware messages</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h5 className="font-medium text-green-900 mb-2">Gamification</h5>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✓ Points for task completion</li>
                    <li>✓ Streak tracking</li>
                    <li>✓ Achievement celebration</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Testing */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>API Endpoints Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium mb-2">Parent Endpoints:</h5>
                  <ul className="space-y-1 text-gray-600">
                    <li><Badge variant="outline">POST</Badge> /api/family/invites</li>
                    <li><Badge variant="outline">POST</Badge> /api/family/invites/:id/send</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Teen Endpoints:</h5>
                  <ul className="space-y-1 text-gray-600">
                    <li><Badge variant="outline">GET</Badge> /api/teen/tasks</li>
                    <li><Badge variant="outline">GET</Badge> /api/teen/stats</li>
                    <li><Badge variant="outline">POST</Badge> /api/teen/tasks/:id/complete</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <TeenDashboard />
      )}

      {/* Modals */}
      <InviteTeenModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      <TeenOnboarding
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}