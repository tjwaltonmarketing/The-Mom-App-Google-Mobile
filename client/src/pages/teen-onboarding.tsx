import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Users, Calendar, Bell, Smartphone, ArrowRight, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function TeenOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
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
  const [, setLocation] = useLocation();

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/teen/complete-setup", {
        profile,
        notificationSettings,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Setup Complete!",
        description: "Welcome to your family coordination hub",
      });
      setLocation("/teen-dashboard");
    },
    onError: () => {
      toast({
        title: "Setup Failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const steps = [
    {
      title: "Create Your Profile",
      description: "Set up your personal information",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircle className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Create Your Profile</h3>
            <p className="text-gray-600">
              Set up your account to get started with the Walton family
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile({...profile, username: e.target.value})}
                placeholder="Choose a username"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={profile.password}
                onChange={(e) => setProfile({...profile, password: e.target.value})}
                placeholder="Create a password"
              />
            </div>

            <div>
              <Label htmlFor="age">Age</Label>
              <Select value={profile.age} onValueChange={(value) => setProfile({...profile, age: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your age" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="13">13</SelectItem>
                  <SelectItem value="14">14</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="16">16</SelectItem>
                  <SelectItem value="17">17</SelectItem>
                  <SelectItem value="18">18</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Favorite Color (for your profile)</Label>
              <div className="flex gap-2 mt-2">
                {["blue", "green", "purple", "pink", "orange"].map((color) => (
                  <button
                    key={color}
                    onClick={() => setProfile({...profile, favoriteColor: color})}
                    className={`w-8 h-8 rounded-full border-2 ${
                      profile.favoriteColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={() => setCurrentStep(1)}
            disabled={!profile.firstName || !profile.lastName || !profile.username || !profile.password || !profile.age}
            className="w-full"
          >
            Continue to Notifications
          </Button>
        </div>
      )
    },
    {
      title: "Notification Preferences",
      description: "Choose how you want to be notified",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Notification Settings</h3>
            <p className="text-gray-600">
              Customize how and when you receive notifications
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Task Reminders</p>
                <p className="text-sm text-gray-600">Get notified about upcoming tasks</p>
              </div>
              <Switch
                checked={notificationSettings.taskReminders}
                onCheckedChange={(checked) => 
                  setNotificationSettings({...notificationSettings, taskReminders: checked})
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Event Notifications</p>
                <p className="text-sm text-gray-600">Alerts for family events and appointments</p>
              </div>
              <Switch
                checked={notificationSettings.eventNotifications}
                onCheckedChange={(checked) => 
                  setNotificationSettings({...notificationSettings, eventNotifications: checked})
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Daily Digest</p>
                <p className="text-sm text-gray-600">Summary of your day each morning</p>
              </div>
              <Switch
                checked={notificationSettings.dailyDigest}
                onCheckedChange={(checked) => 
                  setNotificationSettings({...notificationSettings, dailyDigest: checked})
                }
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">Quiet Hours</p>
                  <p className="text-sm text-gray-600">No notifications during these hours</p>
                </div>
                <Switch
                  checked={notificationSettings.quietHours}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({...notificationSettings, quietHours: checked})
                  }
                />
              </div>

              {notificationSettings.quietHours && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="quietStart">Start Time</Label>
                    <Input
                      id="quietStart"
                      type="time"
                      value={notificationSettings.quietStart}
                      onChange={(e) => 
                        setNotificationSettings({...notificationSettings, quietStart: e.target.value})
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
                        setNotificationSettings({...notificationSettings, quietEnd: e.target.value})
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={() => setCurrentStep(2)}
            className="w-full"
          >
            Complete Setup
          </Button>
        </div>
      )
    },
    {
      title: "All Set!",
      description: "Welcome to your family coordination hub",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Welcome, {profile.firstName}!</h3>
            <p className="text-gray-600">
              You're now connected to the Walton family
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <div>✓ View your tasks and earn points</div>
              <div>✓ Check family events and calendar</div>
              <div>✓ Get notifications based on your preferences</div>
              <div>✓ Connect with your family members</div>
            </div>
          </div>

          <Button
            onClick={() => completeOnboardingMutation.mutate()}
            disabled={completeOnboardingMutation.isPending}
            className="w-full"
          >
            {completeOnboardingMutation.isPending ? "Setting up..." : "Go to Dashboard"}
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Setup</h1>
          <p className="text-gray-600">Just a few more steps to get you started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {steps[currentStep].title}
            </CardTitle>
            <p className="text-center text-sm text-gray-600">
              {steps[currentStep].description}
            </p>
          </CardHeader>
          <CardContent>
            {steps[currentStep].content}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full ${currentStep === 0 ? 'bg-blue-600' : currentStep > 0 ? 'bg-green-600' : 'bg-gray-300'}`} />
            <ArrowRight className="h-3 w-3" />
            <div className={`w-2 h-2 rounded-full ${currentStep === 1 ? 'bg-blue-600' : currentStep > 1 ? 'bg-green-600' : 'bg-gray-300'}`} />
            <ArrowRight className="h-3 w-3" />
            <div className={`w-2 h-2 rounded-full ${currentStep === 2 ? 'bg-green-600' : 'bg-gray-300'}`} />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Step {currentStep + 1} of 3
          </p>
        </div>
      </div>
    </div>
  );
}