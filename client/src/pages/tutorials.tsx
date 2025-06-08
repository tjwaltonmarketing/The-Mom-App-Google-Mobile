import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpFAQ } from "@/components/help-faq";
import { 
  Play, 
  CheckCircle, 
  Clock, 
  Users, 
  Calendar, 
  MessageSquare, 
  Settings, 
  Mic,
  Brain,
  ChevronRight,
  Star,
  Download
} from "lucide-react";

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  icon: React.ComponentType<any>;
  steps: TutorialStep[];
  category: "getting-started" | "family-coordination" | "advanced-features";
}

interface TutorialStep {
  title: string;
  description: string;
  action?: string;
  tips?: string[];
}

const tutorials: Tutorial[] = [
  {
    id: "dashboard-overview",
    title: "Dashboard Overview",
    description: "Learn how to navigate your family command center",
    duration: "3 min",
    difficulty: "beginner",
    icon: Users,
    category: "getting-started",
    steps: [
      {
        title: "Welcome to Your Dashboard",
        description: "The dashboard shows your family's daily snapshot - today's tasks, events, and important deadlines.",
        tips: ["Check the weather widget for planning outdoor activities", "Use quick actions for common tasks"]
      },
      {
        title: "Today's Schedule",
        description: "See what's happening today for each family member with color-coded events.",
        action: "Click on any event to view details or make changes"
      },
      {
        title: "Quick Tasks",
        description: "View pending tasks and mark them complete with one tap.",
        tips: ["Tasks show who they're assigned to", "Priority levels help you focus on what's urgent"]
      },
      {
        title: "Family Progress",
        description: "Track your family's weekly task completion and attendance at events.",
        tips: ["Green progress bars mean you're on track", "Use this to motivate kids with visible progress"]
      }
    ]
  },
  {
    id: "voice-notes",
    title: "Voice Notes & Smart Capture",
    description: "Turn quick thoughts into organized tasks and reminders",
    duration: "4 min",
    difficulty: "beginner",
    icon: Mic,
    category: "family-coordination",
    steps: [
      {
        title: "Start Recording",
        description: "Tap the voice note button on your dashboard or use the floating action button.",
        action: "Say something like: 'Emma needs new soccer cleats by Friday'"
      },
      {
        title: "AI Processing",
        description: "The app listens and automatically creates tasks, assigns them to family members, and sets due dates.",
        tips: ["Speak naturally - mention names, dates, and priorities", "The AI understands family context"]
      },
      {
        title: "Review & Edit",
        description: "Check the suggested tasks and make any adjustments before saving.",
        tips: ["You can change assignments, due dates, or priority levels", "Add additional details if needed"]
      },
      {
        title: "Automatic Notifications",
        description: "Family members get notified about their new tasks via SMS or email.",
        tips: ["Set notification preferences in Settings", "Kids can get simplified reminders"]
      }
    ]
  },
  {
    id: "import-export",
    title: "Import Your Existing Data",
    description: "Transfer notes, tasks, and passwords from other apps",
    duration: "3 min",
    difficulty: "beginner",
    icon: Download,
    category: "getting-started",
    steps: [
      {
        title: "Choose Import Type",
        description: "Navigate to Tasks, Calendar, or Password Vault and click the 'Import' button.",
        action: "Select what type of data you want to transfer"
      },
      {
        title: "Select Your Source App",
        description: "Follow the specific instructions for your current app (Apple Notes, Google Keep, Todoist, etc.).",
        tips: ["Copy text directly from note apps", "Export CSV files from password managers", "Format events as 'Title - Date Time'"]
      },
      {
        title: "Paste or Upload",
        description: "Paste your content into the text area or upload a CSV file for bulk imports.",
        tips: ["One item per line for text imports", "Preview shows how data will be imported", "Review before confirming"]
      },
      {
        title: "Review and Confirm",
        description: "Check the import preview and make any adjustments before finalizing the transfer.",
        tips: ["Verify family member assignments", "Check due dates and priorities", "Edit any formatting issues"]
      }
    ]
  },
  {
    id: "ai-assistant",
    title: "AI Family Assistant",
    description: "Get smart suggestions and automate family coordination",
    duration: "5 min",
    difficulty: "intermediate",
    icon: Brain,
    category: "advanced-features",
    steps: [
      {
        title: "Ask for Help",
        description: "Chat with your AI assistant about family planning, schedules, or task management.",
        action: "Try: 'What should we have for dinner this week?'"
      },
      {
        title: "Smart Suggestions",
        description: "Get personalized meal plans, activity ideas, and schedule optimization based on your family's preferences.",
        tips: ["Mention dietary restrictions or preferences", "Ask for kid-friendly options"]
      },
      {
        title: "Automated Task Creation",
        description: "The AI can create multiple related tasks from a single request.",
        action: "Try: 'Plan Emma's birthday party for next Saturday'"
      },
      {
        title: "Family Context",
        description: "The assistant knows your family members, their schedules, and preferences for better suggestions.",
        tips: ["It remembers previous conversations", "Ask follow-up questions for refined suggestions"]
      }
    ]
  },
  {
    id: "calendar-sync",
    title: "Google Calendar Integration",
    description: "Sync your existing calendars with The Mom App",
    duration: "6 min",
    difficulty: "intermediate",
    icon: Calendar,
    category: "advanced-features",
    steps: [
      {
        title: "Connect Your Account",
        description: "Go to Settings > Calendar Sync and click 'Connect Google Calendar'.",
        action: "Sign in with your Google account that has your family calendar"
      },
      {
        title: "Choose Calendars",
        description: "Select which calendars to sync - family, work, kids' activities, etc.",
        tips: ["You can sync multiple calendars", "Each calendar keeps its original color"]
      },
      {
        title: "Set Sync Direction",
        description: "Choose import only, export only, or two-way sync for each calendar.",
        tips: ["Two-way sync keeps everything in sync automatically", "Import only is safer for work calendars"]
      },
      {
        title: "Automatic Updates",
        description: "Changes in Google Calendar appear in The Mom App and vice versa.",
        tips: ["Turn on automatic sync for real-time updates", "Manual sync gives you more control"]
      }
    ]
  },
  {
    id: "mindful-usage",
    title: "Mindful Usage & Wellness",
    description: "Set healthy boundaries and protect your eyes during screen time",
    duration: "4 min",
    difficulty: "beginner",
    icon: Clock,
    category: "getting-started",
    steps: [
      {
        title: "Enable Break Reminders",
        description: "Go to Settings > Mindful Usage to set up gentle reminders to take breaks.",
        action: "Choose reminder intervals that work for your schedule"
      },
      {
        title: "Activate Blue Light Filter",
        description: "Switch to the blue light filter theme to reduce eye strain during evening use.",
        action: "Click the theme toggle and select 'Blue Light Filter' for easier nighttime viewing",
        tips: ["Perfect for late-night planning sessions", "Reduces sleep disruption from screen time"]
      },
      {
        title: "Customize Messages",
        description: "Set motivational messages that resonate with your goals as a mom.",
        tips: ["Default messages are designed for busy moms", "Add personal reminders about self-care"]
      },
      {
        title: "Track Usage",
        description: "See your daily app usage and break patterns to maintain healthy boundaries.",
        tips: ["Aim for productive sessions with regular breaks", "Use breaks for family time or self-care"]
      },
      {
        title: "Family Modeling",
        description: "Demonstrate healthy tech habits for your children by taking visible breaks.",
        tips: ["Tell kids when you're taking a phone break", "Use break time for family interaction"]
      }
    ]
  },
  {
    id: "password-vault",
    title: "Family Password Vault",
    description: "Securely store and manage family passwords",
    duration: "4 min",
    difficulty: "intermediate",
    icon: Settings,
    category: "advanced-features",
    steps: [
      {
        title: "Access Password Vault",
        description: "From the dashboard, switch to the 'Passwords' tab to view your secure password storage.",
        action: "Click the 'Passwords' tab at the top of the dashboard"
      },
      {
        title: "Add New Passwords",
        description: "Store login credentials for family accounts like school portals, streaming services, and online banking.",
        tips: ["Use categories to organize passwords", "Mark frequently used passwords as favorites"]
      },
      {
        title: "Search and Filter",
        description: "Quickly find passwords using the search bar or filter by categories like 'Kids', 'Banking', or 'Entertainment'.",
        tips: ["Search works on website names and usernames", "Use favorites for quick access to important accounts"]
      },
      {
        title: "Security Features",
        description: "All passwords are encrypted and stored securely. Never share your master password with others.",
        tips: ["Regularly update passwords for better security", "Use strong, unique passwords for each account"]
      }
    ]
  }
];

export default function TutorialsPage() {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Handle URL parameters for direct tutorial access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tutorialId = urlParams.get('tutorial');
    if (tutorialId) {
      const tutorial = tutorials.find(t => t.id === tutorialId);
      if (tutorial) {
        setSelectedTutorial(tutorial);
      }
    }
  }, []);

  const handleStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(stepIndex);
      return newSet;
    });
    if (stepIndex < selectedTutorial!.steps.length - 1) {
      setCurrentStep(stepIndex + 1);
    }
  };

  const resetTutorial = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
  };

  const getDifficultyColor = (difficulty: Tutorial["difficulty"]) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "intermediate": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "advanced": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    }
  };

  if (selectedTutorial) {
    const progress = (completedSteps.size / selectedTutorial.steps.length) * 100;
    const currentStepData = selectedTutorial.steps[currentStep];
    const isCurrentStepCompleted = completedSteps.has(currentStep);

    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setSelectedTutorial(null)}
            className="mb-4"
          >
            ← Back to Tutorials
          </Button>
          
          <div className="flex items-center gap-4 mb-4">
            <selectedTutorial.icon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{selectedTutorial.title}</h1>
              <p className="text-muted-foreground">{selectedTutorial.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <Badge className={getDifficultyColor(selectedTutorial.difficulty)}>
              {selectedTutorial.difficulty}
            </Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {selectedTutorial.duration}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">
                  {completedSteps.size}/{selectedTutorial.steps.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Steps sidebar */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedTutorial.steps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                      index === currentStep 
                        ? "bg-primary/10 border border-primary/20" 
                        : completedSteps.has(index) 
                        ? "bg-green-50 dark:bg-green-950" 
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setCurrentStep(index)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      completedSteps.has(index) 
                        ? "bg-green-500 text-white" 
                        : index === currentStep 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {completedSteps.has(index) ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`text-sm ${index === currentStep ? "font-medium" : ""}`}>
                      {step.title}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Current step content */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{currentStepData.title}</CardTitle>
                  <Badge variant="outline">
                    Step {currentStep + 1} of {selectedTutorial.steps.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{currentStepData.description}</p>

                {currentStepData.action && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Try this:</h4>
                    <p className="text-blue-600 dark:text-blue-400">{currentStepData.action}</p>
                  </div>
                )}

                {currentStepData.tips && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                    <h4 className="font-medium text-amber-700 dark:text-amber-300 mb-2">Pro Tips:</h4>
                    <ul className="space-y-1">
                      {currentStepData.tips.map((tip, index) => (
                        <li key={index} className="text-amber-600 dark:text-amber-400 text-sm flex items-start gap-2">
                          <Star className="h-3 w-3 mt-0.5 fill-current" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  {!isCurrentStepCompleted ? (
                    <Button onClick={() => handleStepComplete(currentStep)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completed
                    </Button>
                  )}
                  
                  {currentStep < selectedTutorial.steps.length - 1 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(currentStep + 1)}
                    >
                      Next Step
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}

                  {progress === 100 && (
                    <Button variant="outline" onClick={resetTutorial}>
                      Restart Tutorial
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const categorizedTutorials = {
    "getting-started": tutorials.filter(t => t.category === "getting-started"),
    "family-coordination": tutorials.filter(t => t.category === "family-coordination"),
    "advanced-features": tutorials.filter(t => t.category === "advanced-features")
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tutorials & Guides</h1>
        <p className="text-muted-foreground">
          Learn how to make the most of The Mom App with step-by-step tutorials
        </p>
      </div>

      <Tabs defaultValue="getting-started" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="family-coordination">Family Coordination</TabsTrigger>
          <TabsTrigger value="advanced-features">Advanced Features</TabsTrigger>
          <TabsTrigger value="faq">FAQ & Help</TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {categorizedTutorials["getting-started"].map((tutorial) => (
              <Card key={tutorial.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <tutorial.icon className="h-6 w-6 text-primary" />
                    <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                  </div>
                  <CardDescription>{tutorial.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(tutorial.difficulty)}>
                        {tutorial.difficulty}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {tutorial.duration}
                      </span>
                    </div>
                    <Button onClick={() => setSelectedTutorial(tutorial)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="family-coordination" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {categorizedTutorials["family-coordination"].map((tutorial) => (
              <Card key={tutorial.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <tutorial.icon className="h-6 w-6 text-primary" />
                    <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                  </div>
                  <CardDescription>{tutorial.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(tutorial.difficulty)}>
                        {tutorial.difficulty}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {tutorial.duration}
                      </span>
                    </div>
                    <Button onClick={() => setSelectedTutorial(tutorial)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="advanced-features" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {categorizedTutorials["advanced-features"].map((tutorial) => (
              <Card key={tutorial.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <tutorial.icon className="h-6 w-6 text-primary" />
                    <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                  </div>
                  <CardDescription>{tutorial.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(tutorial.difficulty)}>
                        {tutorial.difficulty}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {tutorial.duration}
                      </span>
                    </div>
                    <Button onClick={() => setSelectedTutorial(tutorial)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="faq">
          <HelpFAQ />
        </TabsContent>
      </Tabs>
    </div>
  );
}