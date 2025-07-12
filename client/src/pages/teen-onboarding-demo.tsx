import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CheckCircle, ArrowRight, UserCircle } from "lucide-react";

export default function TeenOnboardingDemo() {
  const [inviteCode, setInviteCode] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "",
    age: "",
    favoriteColor: "blue"
  });
  const [, setLocation] = useLocation();

  const handleJoinFamily = () => {
    if (!inviteCode) return;
    
    setIsValidating(true);
    // Simulate validation
    setTimeout(() => {
      setIsValidating(false);
      setCurrentStep(1);
    }, 1500);
  };

  const steps = [
    {
      title: "Enter Invite Code",
      description: "Join your family with the code they sent you",
      content: (
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
            onClick={handleJoinFamily}
            disabled={!inviteCode || isValidating}
            className="w-full"
          >
            {isValidating ? "Validating..." : "Join Family"}
          </Button>
        </div>
      )
    },
    {
      title: "Welcome to the Family!",
      description: "Ready to set up your profile",
      content: (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">
                Joining The Walton Family
              </span>
            </div>
            <p className="text-sm text-green-800">
              You'll be connected to Mom and other family members
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Code Accepted!</h3>
            <p className="text-gray-600">
              Next you would set up your profile and preferences
            </p>
          </div>

          <Button
            onClick={() => setCurrentStep(2)}
            className="w-full"
          >
            Continue to Profile Setup
          </Button>
        </div>
      )
    },
    {
      title: "Set Up Your Profile",
      description: "Tell us a bit about yourself",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircle className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Create Your Profile</h3>
            <p className="text-gray-600">
              Customize your account to get started with the Walton family
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={profile.firstName}
                onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                placeholder="Enter your first name"
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
            onClick={() => setCurrentStep(3)}
            disabled={!profile.firstName || !profile.age}
            className="w-full"
          >
            Complete Setup
          </Button>
        </div>
      )
    },
    {
      title: "Welcome to The Family!",
      description: "You're all set up and ready to go",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Setup Complete!</h3>
            <p className="text-gray-600">
              Welcome to the Walton family, {profile.firstName}! 
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <div>✓ You'll receive task assignments from your parents</div>
              <div>✓ Get notifications for family events and reminders</div>
              <div>✓ Earn points for completing tasks on time</div>
              <div>✓ View your family's shared calendar</div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => setLocation("/teen-dashboard")}
              className="w-full"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => {
                setCurrentStep(0);
                setInviteCode("");
                setProfile({ firstName: "", age: "", favoriteColor: "blue" });
              }}
              variant="outline"
              className="w-full"
            >
              Try Demo Again
            </Button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Teen Onboarding Demo</h1>
          <p className="text-gray-600">This shows what teens see when joining your family</p>
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
            <div className={`w-2 h-2 rounded-full ${currentStep === 2 ? 'bg-blue-600' : currentStep > 2 ? 'bg-green-600' : 'bg-gray-300'}`} />
            <ArrowRight className="h-3 w-3" />
            <div className={`w-2 h-2 rounded-full ${currentStep === 3 ? 'bg-green-600' : 'bg-gray-300'}`} />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Step {currentStep + 1} of 4
          </p>
        </div>
      </div>
    </div>
  );
}