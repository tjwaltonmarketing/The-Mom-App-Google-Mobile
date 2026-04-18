import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, MessageCircleQuestion, Mail } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "getting-started" | "features" | "troubleshooting" | "billing";
  tags: string[];
}

const faqItems: FAQItem[] = [
  {
    id: "getting-started-checklist",
    question: "What is the 'Get started here!' checklist on my dashboard?",
    answer: "When you first log in, you'll see a 'Get started here!' panel at the top of your dashboard. It's a collapsible checklist with 8 steps to help you explore all the key features: adding a family member, creating a calendar event, adding a task, writing a text note, planning a meal, trying the voice AI, trying the text AI assistant, and exploring the password vault. Each step links directly to that feature. The checklist disappears once you've completed all 8 steps, or you can dismiss it manually with the X button.",
    category: "getting-started",
    tags: ["getting-started", "checklist", "onboarding", "dashboard", "new-user"]
  },
  {
    id: "parent-accounts-overview",
    question: "How do parent accounts work? Do both parents get full access?",
    answer: "Parent accounts have complete, unrestricted access to all family coordination features. Both parents can manage calendars, assign tasks, invite family members, access the password vault, and control all settings. When you invite another parent via Settings > Family > 'Invite Parent to Family', they receive full administrative privileges - not a limited view like teen accounts. This ensures true partnership in family coordination.",
    category: "getting-started",
    tags: ["parent", "accounts", "full-access", "administrative", "partnership"]
  },
  {
    id: "parent-invite-process",
    question: "How do I add my spouse/partner to the family coordination?",
    answer: "From Settings > Family, click 'Invite Parent to Family'. Enter their email address and select their role (Mom, Dad, or Parent). The system generates a secure invite code that's sent to their email. They can create a new account or link an existing one. Once accepted, they have complete access to family coordination with their own personalized settings and profile.",
    category: "getting-started",
    tags: ["parent", "invite", "spouse", "partner", "setup"]
  },
  {
    id: "simplified-task-organization",
    question: "How does the simplified task organization reduce mental load?",
    answer: "Tasks are automatically organized into collapsible sections by family member (Emily's Tasks, TJ's Tasks, Adri's Tasks, Evie's Tasks, Unassigned Tasks). This visual grouping eliminates the need for complex child account management while making it clear who is responsible for what. You can collapse sections to focus on specific family members, reducing screen clutter and mental load.",
    category: "features",
    tags: ["task", "organization", "family", "mental-load", "simplicity"]
  },
  {
    id: "add-family-members",
    question: "How do I add family members for task organization?",
    answer: "Go to Settings > Family and click 'Add Child or Teen Profile'. Simply enter their name and role - no complex account setup, passwords, or onboarding required. They immediately appear as a collapsible section in your task management with their own color coding and avatar. This simple approach focuses on task organization rather than complex account management.",
    category: "getting-started",
    tags: ["family", "members", "simple", "setup", "no-accounts"]
  },
  {
    id: "assign-tasks-family-members",
    question: "How do I assign tasks to family members?",
    answer: "When creating a task, simply select the family member from the dropdown menu. The task automatically appears in their collapsible section on the task management page. For younger children, it's simple visual task organization. For teen accounts, there's also a built-in points and gamification system — teens earn points for completing tasks and build streaks over time. You can print customized task lists for each family member.",
    category: "features",
    tags: ["tasks", "assignment", "family", "simple", "organization"]
  },
  {
    id: "printable-task-lists",
    question: "How do the printable task lists work for different family members?",
    answer: "Each family member section has a print button (printer icon) that creates customized printable task lists. Parents get clean, professional checklists perfect for office use. Children get colorful, gamified printouts with emojis and fun designs that are perfect for posting on bedroom walls. This approach works for kids without devices while maintaining visual motivation.",
    category: "features",
    tags: ["print", "task-lists", "children", "parents", "customized"]
  },
  {
    id: "family-member-sections",
    question: "How do the collapsible family member sections work?",
    answer: "Each family member gets their own collapsible section in the task management interface. Click the arrow next to any family member's name to expand or collapse their tasks. This prevents long scrolling and helps you focus on one person's responsibilities at a time. Section states are remembered between visits, and each family member is color-coded for easy identification.",
    category: "features",
    tags: ["family", "sections", "collapsible", "organization", "color-coding"]
  },
  {
    id: "delete-family-members",
    question: "How do I remove family members when no longer needed?",
    answer: "Go to Settings > Family and use the trash icon next to any family member to delete them. This immediately removes them from the task interface and deletes all their assigned tasks. Use this carefully as deletion cannot be undone. This is helpful when family circumstances change or you no longer need to track certain family members.",
    category: "features",
    tags: ["family", "delete", "remove", "management", "cleanup"]
  },
  {
    id: "mental-load-reduction",
    question: "How does this simplified approach reduce mental load for parents?",
    answer: "By eliminating complex child account setup and focusing on simple family member grouping, parents can immediately see who has what tasks without navigating multiple accounts or dashboards. The collapsible sections let you focus on one person at a time, and printable lists work for kids without devices. This visual organization requires less mental energy than complex systems.",
    category: "features",
    tags: ["mental-load", "simplicity", "visual", "organization", "parents"]
  },
  {
    id: "voice-assistant-basics",
    question: "How does the voice AI work?",
    answer: "Tap the red microphone button on your dashboard to open the Voice Assistant. Speak naturally and the AI transcribes your speech in real-time, then analyzes it for tasks, calendar events, and reminders. You'll see smart suggestions you can review and create with one tap. For example, saying 'Pick up groceries tomorrow and schedule Emma's dentist appointment' will suggest creating a grocery task and a calendar event. This is separate from the text-based AI Assistant, which you can find in the main menu for typed conversations.",
    category: "features",
    tags: ["voice", "ai", "assistant", "tasks", "calendar", "microphone"]
  },
  {
    id: "voice-notes-accuracy",
    question: "How accurate is the voice-to-task conversion?",
    answer: "Our AI processes natural speech with high accuracy. It understands family context like names, relationships, and common household tasks. If a task isn't captured correctly, you can always edit it before saving. The system learns from your corrections to improve over time.",
    category: "features",
    tags: ["voice", "ai", "accuracy", "tasks"]
  },
  {
    id: "voice-privacy",
    question: "Is my voice data stored securely?",
    answer: "Voice recordings are transcribed immediately and the audio is processed securely. Only the text transcription is saved as a searchable voice note. Your voice data is never stored permanently or shared with third parties. All processing happens through encrypted connections.",
    category: "features", 
    tags: ["voice", "privacy", "security", "data"]
  },
  {
    id: "family-member-setup",
    question: "How do I add family members?",
    answer: "Go to Settings > Family Settings to add family members. Include their name, role (mom, dad, child), and assign them a color for easy identification. Each member can have their own notification preferences and task assignments.",
    category: "getting-started",
    tags: ["family", "setup", "members", "colors"]
  },
  {
    id: "import-data",
    question: "Can I import my existing notes and tasks from other apps?",
    answer: "Yes! Click the 'Import' button on the Tasks page to transfer data from other apps. You can paste text directly from Apple Notes, Google Keep, Todoist, or upload CSV files from password managers. The system provides step-by-step instructions for popular apps and shows a preview before importing.",
    category: "getting-started",
    tags: ["import", "transfer", "migration", "notes", "tasks", "csv"]
  },
  {
    id: "calendar-sync-issues",
    question: "Why isn't my Google Calendar syncing?",
    answer: "Check that you've granted calendar permissions during the connection process. Ensure you're signed in to the correct Google account that contains your family calendar. If sync stops working, try disconnecting and reconnecting your account in Settings > Calendar Sync.",
    category: "troubleshooting",
    tags: ["calendar", "google", "sync", "permissions"]
  },
  {
    id: "notification-setup",
    question: "How do I set up SMS and email notifications?",
    answer: "Go to Settings > Notifications to configure SMS and email alerts. Enter phone numbers for SMS notifications and email addresses for each family member. You can customize notification types, timing, and frequency for different family members.",
    category: "getting-started",
    tags: ["notifications", "sms", "email", "setup"]
  },
  {
    id: "reminder-schedule",
    question: "How are task and event reminders scheduled?",
    answer: "Task reminders follow this default schedule: (1) Immediate notification when assigned, (2) 2 hours before the due date, (3) 15 minutes after overdue, then every 4 hours until completed. Event reminders are sent 1 day before, 1 hour before, and 15 minutes before the event. You can customize all of these timings in Settings > Notification Preferences.",
    category: "features",
    tags: ["reminders", "schedule", "tasks", "events", "notifications", "timing"]
  },
  {
    id: "customize-reminders",
    question: "Can I change when I receive reminders?",
    answer: "Yes! Go to Settings and tap 'Notification Preferences'. You can customize: (1) Whether you get notified when tasks are assigned, (2) How far before the due date you're reminded (30 minutes to 4 hours), (3) How often overdue reminders repeat (every 2, 4, or 8 hours, or turn them off), (4) When event reminders fire (from 5 minutes to 1 day before). Changes apply to all new tasks and events going forward.",
    category: "features",
    tags: ["customize", "reminders", "schedule", "settings", "notifications", "preferences"]
  },
  {
    id: "ai-assistant-privacy",
    question: "Is my family data private when using the AI assistant?",
    answer: "Yes, your family data is encrypted and never shared with third parties. The AI assistant processes information locally and through secure connections. We don't store conversation history or use your data to train models for other users.",
    category: "features",
    tags: ["privacy", "ai", "security", "data"]
  },
  {
    id: "task-assignments",
    question: "Can I assign tasks to multiple family members?",
    answer: "Currently, tasks can be assigned to one family member at a time. However, you can create separate tasks for each person or use voice notes to say 'remind everyone to clean their rooms' which will create individual tasks for each family member.",
    category: "features",
    tags: ["tasks", "assignment", "multiple", "family"]
  },
  {
    id: "family-merge-process",
    question: "How do I merge accounts when both parents already use the app?",
    answer: "Go to Settings > Family and click 'Merge Families'. Enter your partner's email to send a merge request. When they accept, you'll see a billing decision dialog with three options: Keep Your Billing, Keep Their Billing, or Upgrade to Family Plan ($9.99/month). The app recommends the best option based on trial status and existing subscriptions. After merging, both parents have equal access to all family data.",
    category: "billing",
    tags: ["merge", "families", "accounts", "billing", "parents"]
  },
  {
    id: "billing-plans-overview",
    question: "What are the billing options and pricing?",
    answer: "Individual Plan: $5.99/month or $59.99/year for 1 user with full family coordination features. Family Plan: $9.99/month or $99.99/year for up to 4 users including teen accounts and advanced family features. Every new account gets a 14-day free trial with full access — your payment method is collected at signup but you are not charged until after your trial ends. Cancel anytime.",
    category: "billing",
    tags: ["pricing", "plans", "trial", "billing", "individual", "family"]
  },
  {
    id: "trial-period",
    question: "How does the 14-day trial work?",
    answer: "Your trial starts when you create your account and gives you full access to all features for 14 days. A payment method is required at signup, but you won't be charged until after the trial ends. Trial countdown is visible in Settings > Account. You can cancel anytime before the trial ends and you won't be billed. Trial time remaining is preserved when upgrading or merging accounts.",
    category: "billing",
    tags: ["trial", "14-day", "free", "upgrade", "account"]
  },
  {
    id: "teen-points-persistence",
    question: "Are teen points and achievements saved permanently?",
    answer: "Yes! Teen points, streaks, and task completion history are saved in the database and persist across app restarts and updates. Parents can view complete point history, adjust point values for tasks, and track long-term achievement patterns. The gamification system builds lasting motivation through consistent progress tracking.",
    category: "features",
    tags: ["teen", "points", "persistence", "database", "achievements", "history"]
  },
  {
    id: "family-billing-management",
    question: "Who manages billing when families merge accounts?",
    answer: "During family merge, you choose which account handles billing. The billing decision dialog shows three options with recommendations based on trial status and existing subscriptions. The chosen billing account manages the subscription for both parents. You can change billing responsibility later in Settings > Account.",
    category: "billing",
    tags: ["billing", "management", "merge", "families", "responsibility"]
  },
  {
    id: "subscription-features",
    question: "What's included in the subscription?",
    answer: "Your subscription includes unlimited voice notes, AI meal planning, advanced calendar integration with Google Calendar sync, family password vault, text and voice AI assistants, teen accounts with gamification, and priority support. All features are fully available during your 14-day trial — no restrictions.",
    category: "billing",
    tags: ["subscription", "premium", "features", "limits"]
  },
  {
    id: "mobile-usage",
    question: "Does the app work well on mobile devices?",
    answer: "Yes! The Mom App is designed mobile-first. All features work seamlessly on phones and tablets. The interface adapts to smaller screens, and you can access voice notes, tasks, and the AI assistant from anywhere.",
    category: "features",
    tags: ["mobile", "responsive", "phone", "tablet"]
  },
  {
    id: "data-backup",
    question: "How is my family data backed up?",
    answer: "All your data is automatically backed up to secure cloud storage. Your tasks, events, voice notes, and family information are continuously synchronized and protected. You can export your data anytime from Settings > Data & Privacy.",
    category: "troubleshooting",
    tags: ["backup", "data", "export", "cloud"]
  },
  {
    id: "mindful-usage",
    question: "How do the mindful usage reminders work?",
    answer: "Set break intervals in Settings > Mindful Usage. The app will gently remind you to take breaks with encouraging messages designed for busy moms. You can customize the frequency, messages, and even disable reminders during important family time.",
    category: "features",
    tags: ["mindful", "breaks", "reminders", "wellness"]
  },
  {
    id: "dark-mode",
    question: "What is dark mode and when should I use it?",
    answer: "Dark mode uses darker colors throughout the app, making it easier on your eyes during evening use. Perfect for late-night planning sessions or when checking tasks before bed. This can help reduce eye strain and is easier to use in dark rooms.",
    category: "features",
    tags: ["dark mode", "theme", "eye strain", "night", "display"]
  },
  {
    id: "theme-switching",
    question: "How do I switch between light and dark themes?",
    answer: "Click the theme toggle button in the header (looks like a sun/moon icon) to switch between light mode and dark mode. Light mode works best in bright environments, while dark mode is easier on the eyes at night.",
    category: "getting-started",
    tags: ["theme", "light", "dark", "settings", "display"]
  },
  {
    id: "ai-voice-commands",
    question: "What's the difference between the voice AI and the text AI assistant?",
    answer: "The Mom App has two AI modes. The Voice AI is accessed by tapping the red microphone button on your dashboard — you speak, it transcribes, and it suggests tasks and events to create. The Text AI Assistant is a chat-style interface in the main menu where you type your requests. Both can create tasks, events, meal plans, and more. Use voice when you're on the go, and text when you prefer to type.",
    category: "features",
    tags: ["AI", "voice", "text", "commands", "calendar", "tasks", "assistant", "difference"]
  },
  {
    id: "ai-assignment",
    question: "Will the AI ask me who to assign tasks to?",
    answer: "Yes! If you don't mention a family member in your command, the AI will ask who the task or event should be assigned to. You can also mention names directly like 'Add a task for Emma to clean her room' and it will automatically assign to that person.",
    category: "features",
    tags: ["AI", "assignment", "tasks", "family", "voice"]
  },
  {
    id: "password-vault-security",
    question: "How secure is the family password vault?",
    answer: "The password vault uses bank-level encryption to protect your family's login credentials. All passwords are encrypted before storage and can only be accessed with your master password. We never store your master password - only you can decrypt your data.",
    category: "features",
    tags: ["password", "vault", "security", "encryption"]
  },
  {
    id: "password-vault-access",
    question: "How do I access and use the password vault?",
    answer: "From the dashboard, click the 'Passwords' tab to access your secure vault. You can add new passwords, organize them by categories (Kids, Banking, Entertainment), mark favorites, and search through all entries. Perfect for storing school portal logins, streaming services, and family account credentials.",
    category: "getting-started",
    tags: ["password", "vault", "access", "categories", "family"]
  },
  {
    id: "password-sharing",
    question: "Can I share passwords with family members?",
    answer: "The password vault is designed for secure family password management. You can organize passwords by categories and share access with trusted family members. However, each person should have their own account for better security and individual access tracking.",
    category: "features",
    tags: ["password", "sharing", "family", "security", "access"]
  },
  {
    id: "sms-messaging",
    question: "How does SMS messaging work for teen invites?",
    answer: "The app integrates with Twilio to send real text messages for teen invites. When you create a teen invite and click 'Send Via Text', your teen receives an actual SMS with their invite code and app download instructions. This ensures reliable delivery and makes the onboarding process seamless. Free Twilio accounts include trial credits perfect for family use.",
    category: "features",
    tags: ["SMS", "messaging", "teen", "invites", "Twilio"]
  },
  {
    id: "teen-permissions",
    question: "What can teen accounts access vs. adult accounts?",
    answer: "Teen accounts can view assigned tasks, mark them complete, see family calendar events, and receive notifications. They cannot assign tasks to others, access the family password vault, create family invites, or modify other family members' settings. These permissions protect family privacy while giving teens appropriate independence in managing their responsibilities.",
    category: "features",
    tags: ["teen", "permissions", "access", "security", "family"]
  },
  {
    id: "anti-nagging-benefits",
    question: "How does the 'anti-nagging' system benefit families?",
    answer: "The smart notification system handles progressive chore reminders automatically, reducing the mental load on parents. Instead of repeatedly asking teens about tasks, the app sends gentle reminders that escalate appropriately. Parents get completion notifications without having to check in, and teens develop independence through self-management. This creates a more positive family dynamic with less friction around chores.",
    category: "features",
    tags: ["anti-nagging", "family", "mental load", "independence", "notifications"]
  },
  {
    id: "voice-troubleshooting",
    question: "Voice recording isn't working or transcription is blank",
    answer: "Check that your browser has microphone permissions enabled for this site. On mobile devices, ensure microphone access is granted in your device settings. If transcription appears blank, try speaking more clearly or closer to your device's microphone. The feature works best in quiet environments.",
    category: "troubleshooting",
    tags: ["voice", "microphone", "permissions", "transcription", "mobile"]
  },
  {
    id: "voice-commands",
    question: "What voice commands does the AI understand?",
    answer: "Speak naturally about tasks, appointments, reminders, and family activities. Examples: 'Remind me to call the doctor', 'Schedule soccer practice for Saturday at 2pm', 'Add groceries to my task list', or 'Create a dentist appointment for Emma next week'. The AI understands family member names and common scheduling phrases.",
    category: "features",
    tags: ["voice", "commands", "examples", "natural language", "ai"]
  },
  {
    id: "voice-note-editing",
    question: "Can I edit voice notes after they're created?",
    answer: "Yes! All voice notes are saved with their transcriptions and can be edited later. You can modify the text, convert parts to tasks or events, or delete notes you no longer need. The original voice recognition helps capture your thoughts, but you have full control over the final content.",
    category: "features",
    tags: ["voice", "editing", "transcription", "notes", "tasks"]
  }
];

const categoryLabels = {
  "getting-started": "Getting Started",
  "features": "Features", 
  "troubleshooting": "Troubleshooting",
  "billing": "Billing & Subscription"
};

const categoryColors = {
  "getting-started": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "features": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "troubleshooting": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "billing": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
};

export function HelpFAQ() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const filteredFAQs = faqItems.filter(item => {
    const matchesSearch = searchTerm === "" || 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            Find answers to common questions about The Mom App
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                !selectedCategory 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              All
            </button>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCategory === key 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ Items */}
      <div className="space-y-3">
        {filteredFAQs.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No FAQs found matching your search.</p>
            </CardContent>
          </Card>
        )}
        
        {filteredFAQs.map((item) => (
          <Card key={item.id}>
            <Collapsible
              open={openItems.has(item.id)}
              onOpenChange={() => toggleItem(item.id)}
            >
              <CollapsibleTrigger className="w-full">
                <CardHeader className="hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between text-left">
                    <div className="flex-1">
                      <CardTitle className="text-base">{item.question}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          variant="outline" 
                          className={categoryColors[item.category]}
                        >
                          {categoryLabels[item.category]}
                        </Badge>
                        <div className="flex gap-1">
                          {item.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform ${
                        openItems.has(item.id) ? "rotate-180" : ""
                      }`} 
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-dashed">
        <CardContent className="flex items-center gap-3 py-5">
          <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Need further support?</p>
            <p className="text-sm text-muted-foreground">
              Contact us at{" "}
              <a href="mailto:themomapp.us@gmail.com" className="text-primary underline">
                themomapp.us@gmail.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}