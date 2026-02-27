import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpFAQ } from "@/components/help-faq";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { VoiceNoteModal } from "@/components/voice-note-modal";
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
    id: "simplified-task-management",
    title: "Simplified Task Management",
    description: "Organize family tasks by person with collapsible sections - no complex account setup needed",
    duration: "3 min",
    difficulty: "beginner",
    icon: Users,
    category: "family-coordination",
    steps: [
      {
        title: "View Tasks by Family Member",
        description: "Your tasks are automatically grouped by family member: Emily's Tasks, TJ's Tasks, Adri's Tasks, Evie's Tasks, and Unassigned Tasks.",
        action: "Navigate to Tasks tab to see family member sections",
        tips: ["Each family member has their own collapsible section", "Tasks are color-coded by priority", "No complex account setup required"]
      },
      {
        title: "Collapse/Expand Sections",
        description: "Click the arrow next to any family member's name to collapse or expand their task section. This prevents long scrolling through tasks.",
        action: "Try collapsing and expanding different family member sections",
        tips: ["Collapsed sections save screen space", "Focus on one person's tasks at a time", "Section state is remembered between visits"]
      },
      {
        title: "Create Tasks for Family Members",
        description: "Click 'Add Task' and assign it to any family member from the dropdown. The task will automatically appear in their section.",
        action: "Create a test task and assign it to a family member",
        tips: ["Tasks immediately appear in the correct family member section", "Use clear, actionable task titles", "Set due dates and priorities as needed"]
      },
      {
        title: "Mental Load Reduction",
        description: "This simple grouping approach reduces mental load by organizing tasks visually without complex account management or child profiles.",
        tips: ["No need to create separate accounts for children", "All family task coordination in one simple view", "Easy to see who has what responsibilities"]
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
    id: "web-and-mobile-access",
    title: "Access From Any Device",
    description: "Use The Mom App on your phone or computer - your data syncs everywhere",
    duration: "2 min",
    difficulty: "beginner",
    icon: Download,
    category: "getting-started",
    steps: [
      {
        title: "Web Version Available",
        description: "Log in at https://themom.app from any computer to manage your family. Great for when you're at your desk or need a bigger screen.",
        action: "Visit https://themom.app in your browser",
        tips: ["Same login works on web and mobile", "All your data syncs automatically", "Perfect for detailed planning sessions"]
      },
      {
        title: "Easier Printing from Computer",
        description: "The web version makes it easy to print child task lists, calendars, and other family documents. Just use your browser's print function.",
        tips: ["Print colorful task lists for kids without devices", "Great for posting chore charts on bedroom doors", "Print weekly calendars for the fridge"]
      },
      {
        title: "Mobile App for On-the-Go",
        description: "Use the mobile app for quick access, voice notes, and notifications while you're out running errands or at activities.",
        tips: ["Voice notes capture ideas instantly", "Push notifications keep you updated", "Quick task completion with one tap"]
      },
      {
        title: "Data Syncs Everywhere",
        description: "Changes you make on any device appear instantly on all others. Add a task on your phone, see it on your computer right away.",
        tips: ["Real-time sync across all devices", "Never lose your data", "Family members see updates immediately"]
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
    id: "printable-task-lists",
    title: "Printable Task Lists",
    description: "Create printable task lists with different styles for parents and children",
    duration: "3 min",
    difficulty: "beginner",
    icon: Star,
    category: "family-coordination",
    steps: [
      {
        title: "Print Task Lists for Family Members",
        description: "Each family member section has a print button (printer icon) that creates a printable task list in the appropriate style for that person.",
        action: "Find the printer icon next to any family member's name and click it",
        tips: ["Print button shows just the printer icon to save space", "Each family member gets their own customized printout", "No account setup needed - works with basic family member profiles"]
      },
      {
        title: "Parent Task Lists - Professional Style",
        description: "Parents get clean, professional checklist printouts with simple checkboxes, task titles, descriptions, and priority levels.",
        action: "Try printing a parent's task list to see the professional format",
        tips: ["Clean black and white design", "No gamification elements", "Perfect for office or home use", "Shows priority levels as text"]
      },
      {
        title: "Children's Task Lists - Fun & Motivating",
        description: "Children get colorful, gamified printouts with emojis, fun borders, and encouraging messages to motivate completion.",
        action: "Try printing a child's task list to see the fun design",
        tips: ["Bright colors and fun fonts", "Emojis and motivational messages", "Perfect for posting on bedroom walls", "Encourages task completion through visual appeal"]
      },
      {
        title: "Wall-Posting for Kids Without Devices",
        description: "Printed task lists are perfect for young children who don't have phones or devices - post them on bedroom doors or bulletin boards.",
        tips: ["No devices required for kids", "Visual reminders throughout the day", "Parents can check off completed tasks", "Builds independence and responsibility"]
      }
    ]
  },
  {
    id: "family-member-management",
    title: "Family Member Management",
    description: "Add and manage family members with simple profiles - no complex accounts needed",
    duration: "4 min",
    difficulty: "beginner",
    icon: Users,
    category: "family-coordination",
    steps: [
      {
        title: "Add Family Members",
        description: "Go to Settings > Family and click 'Add Child or Teen Profile'. Simply enter their name and role - no complex account setup required.",
        action: "Try adding a family member with just name and role",
        tips: ["Only basic info needed: name and role", "No passwords or complex onboarding", "Family members appear immediately in task sections"]
      },
      {
        title: "Customize Family Member Profiles",
        description: "Set colors and avatars for each family member to make them easily recognizable in the task interface.",
        action: "Edit a family member to set their color and avatar",
        tips: ["Colors help identify family members quickly", "Avatars make the interface more personal", "Customization is optional but helpful"]
      },
      {
        title: "Delete Family Members When Needed",
        description: "You can delete family members from Settings > Family using the trash icon. This removes them and all their assigned tasks.",
        action: "Practice deleting a test family member",
        tips: ["Deletion removes all associated tasks", "Use carefully as this cannot be undone", "Family members are deleted immediately"]
      },
      {
        title: "Simple Task Assignment",
        description: "Once family members are added, you can assign tasks to them from the task creation modal - they'll appear in their family member section.",
        tips: ["No account setup needed for task assignment", "Tasks immediately appear in family member sections", "Much simpler than complex child account systems"]
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
        tips: ["Family plan supports up to 4 users for $9.99/month", "Individual plans are $5.99/month", "Trial status affects billing recommendations"]
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
    description: "Understand your trial period, bonus days, and billing options for The Mom App",
    duration: "4 min",
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
        title: "Get 7 Bonus Days - Extend to 21 Days",
        description: "Share The Mom App on Facebook during onboarding to extend your trial from 14 to 21 days. Click 'Share on Facebook' then 'Claim Your 7 Bonus Days' to activate.",
        action: "Share during onboarding or from Settings > Account to claim bonus days",
        tips: ["Share opens Facebook with a pre-filled post", "Click 'Claim Your 7 Bonus Days' button after sharing", "Trial extends immediately - no waiting", "Works only once per account"]
      },
      {
        title: "Smart Trial Reminders",
        description: "A friendly reminder banner appears at key moments: when your trial starts, at 7 days remaining, and at 3 days remaining to help you decide before time runs out.",
        tips: ["Dismiss reminders and they'll reappear at the next milestone", "7-day reminder has amber styling", "3-day reminder is more urgent with orange styling", "Quick upgrade button in each reminder"]
      },
      {
        title: "Billing Plans",
        description: "Choose between Individual Plan ($5.99/month or $59.99/year) or Family Plan ($9.99/month or $99.99/year for up to 4 users including teens).",
        tips: ["Family plan includes teen accounts", "Monthly or yearly billing available", "Cancel anytime"]
      },
      {
        title: "Upgrade Options",
        description: "Upgrade directly from Settings > Account or during family merge process. Billing automatically adjusts for your needs.",
        tips: ["Trial time remaining is preserved", "Immediate access after upgrade", "Billing cycle starts from upgrade date"]
      }
    ]
  },
  {
    id: "notification-reminders",
    title: "Notification & Reminder Schedule",
    description: "Understand how reminders work and customize them to fit your routine",
    duration: "3 min",
    difficulty: "beginner",
    icon: Clock,
    category: "getting-started",
    steps: [
      {
        title: "Task Reminders - Default Schedule",
        description: "When a task is created or assigned, you'll get notified right away. Then you'll receive a reminder 2 hours before the due date so you have time to finish it.",
        tips: ["Immediate notification when a task is assigned to you", "2 hours before the due date: a heads-up reminder", "You can turn off assignment notifications if you prefer"]
      },
      {
        title: "Overdue Task Reminders",
        description: "If a task passes its due date without being completed, you'll get a notification 15 minutes after it's overdue. After that, gentle reminders repeat every 4 hours until it's done.",
        tips: ["15 minutes after due: first overdue alert", "Repeats every 4 hours until completed", "Completing or deleting the task stops all reminders"]
      },
      {
        title: "Event Reminders - Default Schedule",
        description: "Calendar events trigger three reminders: 1 day before, 1 hour before, and 15 minutes before the event starts. This gives you plenty of lead time to prepare.",
        tips: ["1 day before: plan ahead reminder", "1 hour before: time to get ready", "15 minutes before: it's almost time"]
      },
      {
        title: "Daily Digest",
        description: "Once a day, you'll receive a summary of all your open tasks, including how many are overdue, due today, and still pending. By default this arrives at 9:00 AM.",
        tips: ["Shows overdue, due today, and pending task counts", "You can change the delivery time in Settings", "Turn it off entirely if you prefer"]
      },
      {
        title: "Customize Your Schedule",
        description: "Go to Settings > Notifications to customize all of these timings. You can change how far in advance you're reminded, adjust the overdue repeat frequency, or turn off specific reminders entirely.",
        action: "Go to Settings and tap 'Notification Preferences' to customize",
        tips: ["Change the pre-due reminder from 30 minutes to 4 hours", "Adjust overdue repeats to every 2, 4, or 8 hours", "Set event reminders to 5 minutes, 30 minutes, or 12 hours before", "All changes take effect immediately for new tasks and events"]
      }
    ]
  },
  {
    id: "feedback-and-feature-requests",
    title: "Submitting Feedback & Feature Requests",
    description: "Share your ideas, report bugs, and help improve The Mom App",
    duration: "2 min",
    difficulty: "beginner",
    icon: MessageSquare,
    category: "getting-started",
    steps: [
      {
        title: "Access the Feedback Tab",
        description: "Go to Settings and click the 'Feedback' tab to find the submission form.",
        action: "Navigate to Settings > Feedback"
      },
      {
        title: "Choose Your Feedback Type",
        description: "Select from three types: General Feedback (share thoughts), Feature Request (suggest new features), or Bug Report (report issues).",
        tips: ["Each type helps us categorize and prioritize", "Feature requests get reviewed for future updates", "Bug reports help us fix problems quickly"]
      },
      {
        title: "Write Your Message",
        description: "Add a subject line and detailed message. The more detail you provide, the better we can understand and act on your feedback.",
        tips: ["Be specific about what you'd like to see", "For bugs, describe what happened vs what you expected", "Include any relevant details like which page you were on"]
      },
      {
        title: "Submit and We'll Respond",
        description: "Click 'Submit Feedback' and your message goes directly to our team. We review every submission and use your input to improve the app.",
        tips: ["You'll see a confirmation when submitted", "Our team receives email notifications", "Your feedback helps shape future updates"]
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
    title: "AI Family Assistant & Voice Commands",
    description: "Create calendar events, tasks, notes, meal plans, and grocery items using voice commands or chat",
    duration: "6 min",
    difficulty: "beginner",
    icon: Brain,
    category: "getting-started",
    steps: [
      {
        title: "Access the AI Assistant",
        description: "Tap the purple AI button (robot icon) in the header or go to the AI Assistant page to chat with your family coordinator.",
        action: "Try typing or saying: 'Add soccer practice tomorrow at 6pm'"
      },
      {
        title: "Create Calendar Events",
        description: "Tell the AI to add events to your calendar and they'll be created automatically. Include dates and times for best results.",
        action: "Examples: 'Schedule dentist appointment Friday at 2pm' or 'Add family movie night this Saturday at 7pm'",
        tips: ["Events are added to your family calendar immediately", "Include specific times like '6pm' or '2:30pm'", "Say 'tomorrow', 'Friday', or specific dates"]
      },
      {
        title: "Create Tasks",
        description: "Ask the AI to create tasks and they'll appear in your task list. Mention family members to assign tasks automatically.",
        action: "Examples: 'Create a task to buy groceries' or 'Add a task for Emma to clean her room'",
        tips: ["Tasks appear in the assigned family member's section", "Set priorities by saying 'urgent' or 'high priority'", "Include due dates for automatic scheduling"]
      },
      {
        title: "Add Notes",
        description: "Save quick notes by telling the AI. Notes are stored and searchable.",
        action: "Example: 'Save a note that Emma's shoe size is now 7'",
        tips: ["Notes appear in your voice notes section", "Great for quick reminders and information"]
      },
      {
        title: "Plan Meals",
        description: "Add meals to your weekly meal plan by voice command.",
        action: "Example: 'Add spaghetti and meatballs to Monday dinner'",
        tips: ["Specify the day and meal type (breakfast, lunch, dinner)", "Meal plans appear in your meal planning section"]
      },
      {
        title: "Add Grocery Items",
        description: "Build your shopping list by telling the AI what you need to buy.",
        action: "Examples: 'Add milk to the grocery list' or 'We need eggs, bread, and cheese'",
        tips: ["Items are added to your grocery list immediately", "Specify quantities like '2 gallons of milk'", "Works with both text and voice commands"]
      },
      {
        title: "Assignment Prompts",
        description: "If you don't specify who a task or event is for, the AI will ask who to assign it to from your family members.",
        tips: ["Mention names like 'for Emma' or 'assign to Dad'", "Unassigned items can be edited later", "The AI knows your family members"]
      },
      {
        title: "Voice Notes Button",
        description: "Use the orange microphone button for quick voice capture. Speak naturally and the AI will suggest tasks and events to create.",
        action: "Click the mic, speak your command, then confirm the suggested actions",
        tips: ["Review suggestions before confirming", "You can edit suggestions before creating", "Create all or individual items"]
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
    id: "timezone-settings",
    title: "Time Zone Settings",
    description: "Set your time zone so events and tasks show the right times wherever you are",
    duration: "2 min",
    difficulty: "beginner",
    icon: Clock,
    category: "getting-started",
    steps: [
      {
        title: "Automatic Detection",
        description: "By default, the app detects your device's time zone automatically. If you're in New York, you'll see Eastern Time; in Denver, you'll see Mountain Time.",
        tips: ["No setup needed if your phone's time zone is correct", "Works automatically for most users", "Times adjust when you travel to a new time zone"]
      },
      {
        title: "Change Time Zone on Calendar or Tasks",
        description: "On the Calendar or Tasks page, you'll see a small globe icon under the page title showing your current time zone. Tap it to switch to a different one.",
        action: "Go to Calendar and look for the globe icon below 'Family Calendar'",
        tips: ["Useful when planning events in another time zone", "Event times adjust immediately", "Your choice is remembered until you change it"]
      },
      {
        title: "Set a Permanent Time Zone in Settings",
        description: "Go to Settings > General to find the Time Zone card. Pick your preferred time zone from the dropdown and click 'Save Settings' to lock it in across all your devices.",
        action: "Navigate to Settings and find the Time Zone section at the top",
        tips: ["Saved to your account so it works on any device", "Overrides automatic detection", "Use 'Reset to device time zone' to go back to auto-detect"]
      },
      {
        title: "Traveling? No Problem",
        description: "If you travel, you can either let the app auto-detect your new location or keep your home time zone. Change it back anytime from Settings or the Calendar page.",
        tips: ["Great for coordinating across different time zones", "Family members can each set their own time zone", "Teen accounts also support time zone selection"]
      }
    ]
  },
  {
    id: "theme-settings",
    title: "Theme & Display Settings",
    description: "Customize your app appearance with Light or Dark mode",
    duration: "2 min",
    difficulty: "beginner",
    icon: Clock,
    category: "getting-started",
    steps: [
      {
        title: "Switch Themes",
        description: "Click the theme toggle button (sun/moon icon) in the header to switch between Light and Dark mode.",
        action: "Try switching between Light and Dark mode to see which you prefer",
        tips: ["Dark mode is easier on the eyes at night", "Light mode works best in bright environments"]
      },
      {
        title: "Dark Mode Benefits",
        description: "Dark mode reduces eye strain during evening use and can help preserve battery on mobile devices.",
        tips: ["Great for nighttime planning sessions", "Easier to use in dark rooms", "Reduces screen glare"]
      },
      {
        title: "Theme Persistence",
        description: "Your theme choice is saved automatically and applies across all pages of the app.",
        tips: ["Theme preference is remembered between sessions", "Both themes have full functionality"]
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
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

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
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36 lg:pb-6">
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
      </main>
      
      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />
    </div>
  );
}