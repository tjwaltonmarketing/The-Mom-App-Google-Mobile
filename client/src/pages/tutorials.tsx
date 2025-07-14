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
    id: "parent-account-management",
    title: "Parent Account Management",
    description: "Set up multiple parent accounts with full family coordination access",
    duration: "4 min",
    difficulty: "beginner",
    icon: Users,
    category: "family-coordination",
    steps: [
      {
        title: "Invite Another Parent",
        description: "From Settings > Family, click 'Invite Parent to Family'. Enter their email address and select their role (Mom, Dad, or Parent).",
        action: "Fill out parent email and role information",
        tips: ["Parent accounts have full app functionality", "Both parents can manage all family coordination", "No restrictions like teen accounts"]
      },
      {
        title: "Send Parent Invitation",
        description: "The system generates a unique invite code and sends it to the parent's email. They can use this code to join your family coordination.",
        action: "Copy invite code or share directly with parent",
        tips: ["Invite codes are secure and expire after 7 days", "Parents can create accounts or use existing ones", "Automatic family linking upon acceptance"]
      },
      {
        title: "Parent Account Features",
        description: "Invited parents get full access: calendar management, task creation, family member management, password vault, and all administrative features.",
        tips: ["Both parents can invite teens and manage family", "Complete privacy control settings", "Shared access to all family data", "Equal administrative privileges"]
      },
      {
        title: "Family Member Linking",
        description: "Parent accounts automatically link to their family member profiles, enabling personalized colors, avatars, and notification preferences.",
        tips: ["Parents see their personal calendar and family calendar", "Notification preferences sync across accounts", "Profile customization maintained"]
      }
    ]
  },
  {
    id: "teen-account-setup",
    title: "Teen Account Setup (Anti-Nagging System)",
    description: "Set up teen accounts with smart notifications and task assignment that eliminates parent nagging",
    duration: "6 min",
    difficulty: "beginner",
    icon: Users,
    category: "family-coordination",
    steps: [
      {
        title: "Create Teen Invite",
        description: "From Settings > Family, click 'Invite Teen to Family'. Enter their name, phone number or email, and set permissions.",
        action: "Fill out teen information and contact details",
        tips: ["Use their real phone number for SMS invites", "Set appropriate permissions based on age", "Teen accounts reduce parent 'nagging' by automating reminders"]
      },
      {
        title: "Send Multi-Channel Invitation",
        description: "Choose to send via SMS (Twilio) or email (SendGrid). The teen receives an invite code with setup instructions across multiple channels.",
        action: "Click 'Send Via Text' or 'Send Via Email' with automatic failover",
        tips: ["SMS delivery is instant", "Email includes professional HTML templates", "Invite codes expire in 7 days", "You can resend if needed"]
      },
      {
        title: "Teen Dashboard & Gamification",
        description: "Teens get a focused interface with points system (10-50 points per task), streak tracking, and achievement badges for completing tasks.",
        action: "Help teen explore their dashboard and point system",
        tips: ["Points motivate task completion", "Streaks build habits", "Dark mode and blue light filter available", "Calendar shows assigned tasks and family dinners"]
      },
      {
        title: "Parent Task Assignment",
        description: "Assign tasks directly to teens with categories (chores, homework, family), time estimates, and point values. Tasks flow seamlessly to teen dashboard.",
        action: "Use task assignment modal to create teen-specific tasks",
        tips: ["Include clear descriptions and time estimates", "Set appropriate point values", "Use categories for organization", "Teens get notified automatically"]
      },
      {
        title: "Smart Progressive Notifications",
        description: "The app handles chore reminders automatically with gentle escalation, quiet hours respect, and celebration messages - eliminating parent nagging.",
        tips: ["Gentle first reminders", "Escalation for overdue tasks", "Celebration messages for completion", "Respects quiet hours (9 PM - 8 AM)", "Parents get completion notifications"]
      }
    ]
  },
  {
    id: "voice-assistant-quickstart",
    title: "Voice Assistant Quick Start",
    description: "Start using voice commands to create tasks and events instantly",
    duration: "4 min",
    difficulty: "beginner",
    icon: Mic,
    category: "getting-started",
    steps: [
      {
        title: "Find the Voice Button",
        description: "Look for the microphone icon on your dashboard. This opens the voice note recorder.",
        action: "Click the microphone button to start your first voice note"
      },
      {
        title: "Speak Naturally",
        description: "Record a message like 'Remind me to pick up groceries tomorrow and schedule Emma's dentist appointment for Friday at 2pm'.",
        tips: ["Speak clearly and naturally", "Include family member names", "Mention specific dates and times"]
      },
      {
        title: "Review AI Suggestions",
        description: "The AI will analyze your voice and suggest creating tasks and calendar events. Review these suggestions before accepting.",
        tips: ["Check task assignments", "Verify dates and times", "Edit any details that need adjustment"]
      },
      {
        title: "Create or Save",
        description: "Choose 'Create All' to add suggested tasks and events, or 'Save Note Only' to keep just the voice transcription.",
        tips: ["You can always convert notes to tasks later", "Voice notes are searchable", "All transcriptions are saved automatically"]
      }
    ]
  },
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
    id: "teen-dashboard-guide",
    title: "Teen Dashboard & Gamification",
    description: "Help teens stay motivated with points, streaks, and achievement tracking",
    duration: "5 min",
    difficulty: "beginner",
    icon: Star,
    category: "family-coordination",
    steps: [
      {
        title: "Understanding the Teen Dashboard",
        description: "The teen dashboard shows assigned tasks, today's events, points earned, and current streak.",
        tips: ["Tasks are color-coded by priority", "Streaks encourage daily completion", "Points can be tracked weekly"]
      },
      {
        title: "Task Completion System",
        description: "Teens tap 'Mark Complete' on tasks to earn points and maintain their streak.",
        action: "Show teen how to complete tasks",
        tips: ["Completing tasks before deadline earns bonus points", "Streaks reset if tasks are missed", "Parents get automatic completion notifications"]
      },
      {
        title: "Smart Notification Settings",
        description: "Teens can customize when and how they receive task reminders to fit their schedule.",
        action: "Help teen set quiet hours and notification preferences",
        tips: ["Quiet hours prevent late-night notifications", "Progressive reminders get more urgent over time", "Achievement celebrations are always allowed"]
      },
      {
        title: "Parent Benefits",
        description: "Parents see real-time completion status and can focus on encouragement instead of reminders.",
        tips: ["No more repeated asking about chores", "Automatic escalation for overdue tasks", "Celebration messages for achievements"]
      }
    ]
  },
  {
    id: "parent-teen-task-assignment",
    title: "Parent-to-Teen Task Assignment",
    description: "Assign tasks directly to teens with points, categories, and automatic notifications",
    duration: "5 min",
    difficulty: "beginner",
    icon: Users,
    category: "family-coordination",
    steps: [
      {
        title: "Open Task Assignment",
        description: "From your dashboard or task management page, click 'Assign Task to Teen' or use the task assignment modal.",
        action: "Select the teen you want to assign a task to",
        tips: ["Only teens with accounts can receive assigned tasks", "Demo teens (Alex, Jordan, Sam) are available for testing"]
      },
      {
        title: "Create the Task",
        description: "Enter task title, detailed description, category (chores, homework, family), and estimated time to complete.",
        action: "Fill out task details with clear expectations",
        tips: ["Include specific instructions", "Set realistic time estimates", "Choose appropriate categories for organization"]
      },
      {
        title: "Set Points and Priority",
        description: "Assign point values (10-50 points) based on task difficulty and set priority level (low, medium, high).",
        action: "Choose points that motivate without overwhelming",
        tips: ["10-20 points for simple tasks", "30-40 points for moderate tasks", "50 points for complex or important tasks"]
      },
      {
        title: "Schedule and Assign",
        description: "Set due date, assign to specific teen, and send the task. The teen receives automatic notifications and sees it on their dashboard.",
        tips: ["Tasks appear immediately on teen dashboard", "Progressive reminders automatically handle follow-up", "Parents get completion notifications"]
      },
      {
        title: "Track Progress",
        description: "Monitor task completion, teen points, and streaks from your parent dashboard. Celebrate achievements and adjust point values as needed.",
        tips: ["Completed tasks boost teen streaks", "Points accumulate for achievements", "Use completion data to refine task assignment"]
      }
    ]
  },
  {
    id: "family-merge-billing",
    title: "Family Account Merging & Billing",
    description: "Combine accounts when both parents are already using the app and manage billing",
    duration: "4 min",
    difficulty: "intermediate",
    icon: Users,
    category: "family-coordination",
    steps: [
      {
        title: "When to Merge Accounts",
        description: "If both you and your partner already have accounts, you can merge them into one family account to share calendars, tasks, and coordination.",
        tips: ["Merging combines all family data", "One billing account manages the subscription", "Both parents keep equal access"]
      },
      {
        title: "Send Merge Request",
        description: "Go to Settings > Family and click 'Merge Families'. Enter your partner's email address to send a merge request.",
        action: "Your partner will receive a notification to accept the merge",
        tips: ["Both accounts must be active", "Request expires after 7 days", "Either parent can initiate the merge"]
      },
      {
        title: "Choose Billing Management",
        description: "When merging, you'll see a billing decision dialog with three options: Keep Your Billing, Keep Partner's Billing, or Upgrade to Family Plan.",
        tips: ["Family plan supports up to 4 users for $19.99/month", "Individual plans are $9.99/month", "Trial status affects billing recommendations"]
      },
      {
        title: "Billing Decision Guide",
        description: "The app recommends the best option based on trial status and existing subscriptions. Family plan is suggested when you have teens or need more users.",
        tips: ["Active trials are prioritized", "Family plan includes teen accounts", "You can change billing later in Settings"]
      },
      {
        title: "Complete the Merge",
        description: "After billing decisions, accounts combine immediately. Both parents have equal access to all family data and settings.",
        tips: ["All events and tasks are preserved", "Teen accounts transfer automatically", "Notification preferences merge intelligently"]
      }
    ]
  },
  {
    id: "trial-and-billing",
    title: "14-Day Trial & Subscription Management",
    description: "Understand your trial period and billing options for The Mom App",
    duration: "3 min",
    difficulty: "beginner",
    icon: Star,
    category: "getting-started",
    steps: [
      {
        title: "Your 14-Day Trial",
        description: "Every new account gets 14 days of full access to test all features. Trial countdown is visible in Settings > Account.",
        tips: ["Trial starts when you create your account", "Full access to all features", "No credit card required to start"]
      },
      {
        title: "Billing Plans",
        description: "Choose between Individual Plan ($9.99/month for 1 user) or Family Plan ($19.99/month for up to 4 users including teens).",
        tips: ["Family plan includes teen accounts", "Monthly billing only", "Cancel anytime"]
      },
      {
        title: "Upgrade Options",
        description: "Upgrade directly from Settings > Account or during family merge process. Billing automatically adjusts for your needs.",
        tips: ["Trial time remaining is preserved", "Immediate access after upgrade", "Billing cycle starts from upgrade date"]
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
    title: "AI Family Assistant & Voice Features",
    description: "Get smart suggestions and automate family coordination with voice commands",
    duration: "7 min",
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
        title: "Voice-to-Assistant",
        description: "Record voice notes that automatically create tasks and calendar events. Click the voice note button to start recording.",
        action: "Try saying: 'Remind me to pick up groceries tomorrow and schedule Emma's dentist appointment for next Friday'",
        tips: ["Speak naturally - the AI understands context", "Review suggested tasks before creating them"]
      },
      {
        title: "Smart Action Recognition",
        description: "The AI analyzes your voice input and suggests relevant tasks, calendar events, and reminders.",
        tips: ["Mention family member names for task assignments", "Include dates and times for automatic scheduling"]
      },
      {
        title: "Voice Note Management",
        description: "All voice recordings are transcribed and saved as searchable notes, even if you don't create tasks from them.",
        tips: ["Use voice notes for quick thoughts", "Convert important notes to tasks later"]
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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 h-auto">
          <TabsTrigger value="getting-started" className="text-xs sm:text-sm px-2 py-3 h-12 flex items-center justify-center">Getting Started</TabsTrigger>
          <TabsTrigger value="family-coordination" className="text-xs sm:text-sm px-2 py-3 h-12 flex items-center justify-center">Family Coordination</TabsTrigger>
          <TabsTrigger value="advanced-features" className="text-xs sm:text-sm px-2 py-3 h-12 flex items-center justify-center">Advanced Features</TabsTrigger>
          <TabsTrigger value="faq" className="text-xs sm:text-sm px-2 py-3 h-12 flex items-center justify-center">FAQ & Help</TabsTrigger>
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