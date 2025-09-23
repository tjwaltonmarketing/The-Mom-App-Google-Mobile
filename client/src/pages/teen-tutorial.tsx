import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Bell,
  Settings,
  Moon,
  Eye,
  Camera,
  Star,
  Trophy,
  Flame,
  Plus,
  Users,
  BookOpen,
  Play
} from "lucide-react";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
  demo?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to Your Family Space!",
    description: "This is your simple dashboard to stay connected with your family. No complex features - just what you need!",
    icon: <Star className="h-8 w-8 text-purple-500" />,
    tips: [
      "See your tasks assigned by family members",
      "View today's family events and activities",
      "Simple, clean interface focused on what matters"
    ]
  },
  {
    id: 2,
    title: "Quick Theme Controls",
    description: "Make the app comfortable for your eyes! Use these buttons anytime you want.",
    icon: <Moon className="h-8 w-8 text-blue-500" />,
    tips: [
      "🌙 Moon icon = Dark mode (great for night time)",
      "👁️ Eye icon = Blue light filter (easier on your eyes)",
      "Both work instantly when you click them",
      "Perfect for studying late or using before bed"
    ]
  },
  {
    id: 3,
    title: "Your Calendar & Tasks",
    description: "See what's coming up and what you need to do. Everything is color-coded to make it easy!",
    icon: <Calendar className="h-8 w-8 text-green-500" />,
    tips: [
      "Purple events = Your personal stuff",
      "Green/Blue events = Family activities", 
      "Tasks show with clear descriptions and due dates",
      "Tap the + button to add your own events"
    ]
  },
  {
    id: 4,
    title: "Notifications & Updates",
    description: "Stay in the loop with what's happening in your family. The bell icon keeps you informed!",
    icon: <Bell className="h-8 w-8 text-orange-500" />,
    tips: [
      "Click the bell to see family updates",
      "Get notified about new tasks or events",
      "See family updates and important messages",
      "Never miss important family stuff"
    ]
  },
  {
    id: 5,
    title: "Task Completion",
    description: "Mark tasks complete when you finish them. Simple and straightforward - no complex scoring needed!",
    icon: <CheckCircle className="h-8 w-8 text-green-500" />,
    tips: [
      "Mark tasks complete when you finish them",
      "Parents get notified automatically",
      "No complex points system - just simple completion",
      "Focus on helping family rather than earning scores"
    ]
  },
  {
    id: 6,
    title: "Customize Your Profile",
    description: "Make the app truly yours! Upload your photo and pick your favorite colors.",
    icon: <Camera className="h-8 w-8 text-pink-500" />,
    tips: [
      "Click the Settings gear to customize",
      "Upload your own profile picture",
      "Choose your favorite theme color",
      "Set up dark mode and blue light filter preferences"
    ]
  }
];

export default function TeenTutorial() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setIsCompleted(false);
  };

  const currentTutorial = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-700">
                Awesome! You're All Set! 🎉
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                You've learned how to use all the cool features in your dashboard. 
                Now you're ready to stay organized and connected with your family!
              </p>
              
              <div className="space-y-4">
                <Button 
                  onClick={() => setLocation("/teen-dashboard")}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Using Your Dashboard
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(0);
                    setIsCompleted(false);
                  }}
                  className="w-full"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Review Tutorial Again
                </Button>
              </div>

              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700">
                  <strong>Pro Tip:</strong> You can always come back to this tutorial 
                  from the Settings menu if you need a refresher!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/teen-dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Badge variant="secondary">
            Step {currentStep + 1} of {tutorialSteps.length}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Tutorial Progress</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Main Tutorial Card */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {currentTutorial.icon}
            </div>
            <CardTitle className="text-xl">
              {currentTutorial.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center mb-6">
              {currentTutorial.description}
            </p>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">What you can do:</h4>
              {currentTutorial.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            {tutorialSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep 
                    ? "bg-purple-500" 
                    : index < currentStep 
                      ? "bg-green-500" 
                      : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          <Button 
            onClick={nextStep}
            className="flex items-center gap-2"
          >
            {currentStep === tutorialSteps.length - 1 ? "Finish" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Tips */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Did you know?</h4>
                <p className="text-sm text-blue-700">
                  Everything you do in this app helps your family stay organized! 
                  Your parents can see when you complete tasks and add events, 
                  making family life smoother for everyone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}