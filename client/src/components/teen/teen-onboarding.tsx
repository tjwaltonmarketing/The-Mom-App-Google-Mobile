import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, Calendar, Bell, Smartphone, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TeenOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

export function TeenOnboarding({ isOpen, onClose }: TeenOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [inviteCode, setInviteCode] = useState("");
  const [familyInfo, setFamilyInfo] = useState<any>(null);
  const [teenProfile, setTeenProfile] = useState({
    firstName: "",
    lastName: "",
    age: "",
    favoriteColor: "blue",
  });
  const [notificationSettings, setNotificationSettings] = useState({
    taskReminders: true,
    eventNotifications: true,
    dailyDigest: true,
    quietHours: true,
    quietStart: "22:00",
    quietEnd: "08:00",
  });
  const { toast } = useToast();

  const validateInviteMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/family/invites/validate", { inviteCode: code });
      return response.json();
    },
    onSuccess: (data) => {
      setFamilyInfo(data.family);
      setCurrentStep(1);
      toast({
        title: "Invite Code Valid",
        description: `Ready to join ${data.family.name}'s family!`,
      });
    },
    onError: () => {
      toast({
        title: "Invalid Invite Code",
        description: "Please check the code and try again",
        variant: "destructive",
      });
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/teen/complete-onboarding", {
        inviteCode,
        profile: teenProfile,
        notificationSettings,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to the Family!",
        description: "Your teen account is ready to use",
      });
      onClose();
      // Redirect to teen dashboard
      window.location.href = "/teen-dashboard";
    },
  });

  const steps: OnboardingStep[] = [
    {
      id: "invite",
      title: "Enter Invite Code",
      description: "Join your family with the code they sent you",
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Join Your Family</h3>
            <p className="text-gray-600">
              Enter the invite code your parent sent you via text or email
            </p>
          </div>

          <div>
            <Label htmlFor="inviteCode">Family Invite Code</Label>
            <Input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="FAM-2024-XYZ"
              className="text-center font-mono text-lg"
            />
          </div>

          <Button
            onClick={() => validateInviteMutation.mutate(inviteCode)}
            disabled={!inviteCode || validateInviteMutation.isPending}
            className="w-full"
          >
            {validateInviteMutation.isPending ? "Validating..." : "Join Family"}
          </Button>
        </div>
      ),
    },
    {
      id: "profile",
      title: "Create Your Profile",
      description: "Tell us about yourself",
      component: (
        <div className="space-y-6">
          {familyInfo && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">
                  Joining {familyInfo.name}'s Family
                </span>
              </div>
              <p className="text-sm text-green-800">
                You'll be connected to {familyInfo.parentName} and other family members
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={teenProfile.firstName}
                  onChange={(e) => setTeenProfile({ ...teenProfile, firstName: e.target.value })}
                  placeholder="Alex"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={teenProfile.lastName}
                  onChange={(e) => setTeenProfile({ ...teenProfile, lastName: e.target.value })}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={teenProfile.age}
                onChange={(e) => setTeenProfile({ ...teenProfile, age: e.target.value })}
                placeholder="16"
                min="8"
                max="25"
              />
            </div>

            <div>
              <Label>Profile Color</Label>
              <div className="flex gap-2 mt-2">
                {["blue", "green", "purple", "pink", "orange"].map((color) => (
                  <button
                    key={color}
                    onClick={() => setTeenProfile({ ...teenProfile, favoriteColor: color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      teenProfile.favoriteColor === color ? "border-gray-800" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={() => setCurrentStep(2)}
            disabled={!teenProfile.firstName || !teenProfile.lastName || !teenProfile.age}
            className="w-full"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      ),
    },
    {
      id: "notifications",
      title: "Notification Preferences",
      description: "Choose how you want to be reminded about tasks and events",
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Stay on Top of Things</h3>
            <p className="text-gray-600">
              Set up notifications so the app can remind you (instead of your parents!)
            </p>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What to notify you about</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Task Reminders</Label>
                    <p className="text-sm text-gray-600">Get reminded about chores and assignments</p>
                  </div>
                  <Switch
                    checked={notificationSettings.taskReminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, taskReminders: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Calendar Events</Label>
                    <p className="text-sm text-gray-600">Family events and your schedule</p>
                  </div>
                  <Switch
                    checked={notificationSettings.eventNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, eventNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Daily Summary</Label>
                    <p className="text-sm text-gray-600">Morning overview of your day</p>
                  </div>
                  <Switch
                    checked={notificationSettings.dailyDigest}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, dailyDigest: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quiet Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Enable Quiet Hours</Label>
                    <p className="text-sm text-gray-600">No notifications during sleep time</p>
                  </div>
                  <Switch
                    checked={notificationSettings.quietHours}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, quietHours: checked })
                    }
                  />
                </div>

                {notificationSettings.quietHours && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quietStart">Start Time</Label>
                      <Input
                        id="quietStart"
                        type="time"
                        value={notificationSettings.quietStart}
                        onChange={(e) =>
                          setNotificationSettings({ ...notificationSettings, quietStart: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="quietEnd">End Time</Label>
                      <Input
                        id="quietEnd"
                        type="time"
                        value={notificationSettings.quietEnd}
                        onChange={(e) =>
                          setNotificationSettings({ ...notificationSettings, quietEnd: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Button
            onClick={() => setCurrentStep(3)}
            className="w-full"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      ),
    },
    {
      id: "complete",
      title: "You're All Set!",
      description: "Welcome to your family's coordination system",
      component: (
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Welcome to the Family!</h3>
            <p className="text-gray-600">
              Your teen account is ready. Here's what you can do:
            </p>
          </div>

          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-blue-900">View Your Tasks</div>
                <div className="text-sm text-blue-700">See chores and assignments from your parents</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-purple-900">Family Calendar</div>
                <div className="text-sm text-purple-700">Stay updated on family events and your schedule</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg">
              <Smartphone className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-green-900">Smart Notifications</div>
                <div className="text-sm text-green-700">Get reminded without parents having to nag!</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium mb-2">
              Pro Tip: Complete tasks quickly to keep your parents happy! 😊
            </p>
            <p className="text-xs text-yellow-700">
              The app will send gentle reminders so your parents don't have to
            </p>
          </div>

          <Button
            onClick={() => completeOnboardingMutation.mutate()}
            disabled={completeOnboardingMutation.isPending}
            className="w-full"
          >
            {completeOnboardingMutation.isPending ? "Setting up your account..." : "Start Using The App"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{steps[currentStep].title}</DialogTitle>
            <Badge variant="outline">{currentStep + 1} of {steps.length}</Badge>
          </div>
          <p className="text-sm text-gray-600">{steps[currentStep].description}</p>
        </DialogHeader>

        <div className="py-4">
          {steps[currentStep].component}
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center space-x-2 pt-4 border-t">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index <= currentStep ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}