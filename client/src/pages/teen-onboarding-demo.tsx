import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, ArrowRight } from "lucide-react";

export default function TeenOnboardingDemo() {
  const [inviteCode, setInviteCode] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isValidating, setIsValidating] = useState(false);

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
                Joining The Smith Family
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
            onClick={() => setCurrentStep(0)}
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
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
            <div className={`w-2 h-2 rounded-full ${currentStep === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <ArrowRight className="h-3 w-3" />
            <div className={`w-2 h-2 rounded-full ${currentStep === 1 ? 'bg-green-600' : 'bg-gray-300'}`} />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Step {currentStep + 1} of 2
          </p>
        </div>
      </div>
    </div>
  );
}