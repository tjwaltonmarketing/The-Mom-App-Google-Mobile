import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, MessageCircleQuestion } from "lucide-react";
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
    id: "teen-accounts-overview",
    question: "How do teen accounts help reduce parent 'nagging'?",
    answer: "Teen accounts include smart notification systems that handle chore reminders automatically. Instead of parents repeatedly asking about tasks, the app sends progressive reminders to teens directly. It starts with gentle notifications and escalates appropriately, while celebrating completions. Parents get status updates without needing to ask, and teens develop independence through gamified task management with points and streaks.",
    category: "features",
    tags: ["teen", "accounts", "notifications", "chores", "independence", "gamification"]
  },
  {
    id: "teen-invite-process",
    question: "How do I set up a teen account for my child?",
    answer: "From Settings > Family, click 'Invite Teen to Family'. Enter their name, phone number or email, set age-appropriate permissions, and send the invitation via SMS (Twilio) or email (SendGrid). They'll receive an invite code with download instructions across multiple channels. Teen accounts include task assignments, calendar access, and smart notifications while restricting access to adult features like family passwords or task assignment to others.",
    category: "getting-started",
    tags: ["teen", "setup", "invite", "permissions", "SMS", "email"]
  },
  {
    id: "parent-teen-task-assignment",
    question: "How do I assign tasks directly to my teen?",
    answer: "Use the task assignment modal to create tasks specifically for teens. Include task description, category (chores, homework, family), estimated time, and point value (10-50 points). Tasks automatically appear on the teen's dashboard with notifications. You can track completion, monitor teen points and streaks, and receive completion notifications without needing to ask about progress.",
    category: "features",
    tags: ["teen", "tasks", "assignment", "points", "tracking"]
  },
  {
    id: "teen-gamification",
    question: "How does the points and streaks system work for teens?",
    answer: "Teens earn 10-50 points for completing tasks on time, with bonus points for early completion. Daily streaks encourage consistent task completion. The teen dashboard shows weekly points, current streak, and today's completion status with tab navigation between Home, Calendar, and Passwords. This gamification makes chores more engaging while giving parents visibility into progress without constant check-ins. Achievement celebrations reinforce positive behavior.",
    category: "features",
    tags: ["teen", "points", "streaks", "gamification", "motivation", "dashboard"]
  },
  {
    id: "teen-dashboard-features",
    question: "What can teens see and do in their dashboard?",
    answer: "Teen dashboards include tab navigation with Home (assigned tasks, points, streaks), Calendar (family events and personal schedule), and Passwords (parent-shared family accounts). They can complete tasks, view family dinner plans, access dark mode and blue light filters, and receive achievement notifications. Parents control which family passwords are shared with teens for appropriate access to family accounts.",
    category: "features",
    tags: ["teen", "dashboard", "navigation", "calendar", "passwords", "features"]
  },
  {
    id: "teen-notifications",
    question: "How do smart notifications work for teen accounts?",
    answer: "Teen accounts include progressive reminder systems that respect quiet hours and personal schedules. Notifications start gentle and escalate appropriately for overdue tasks. Teens can customize notification preferences, set quiet hours, and choose how they want to receive reminders. The system celebrates achievements and maintains positive engagement while ensuring tasks get completed.",
    category: "features",
    tags: ["teen", "notifications", "reminders", "quiet hours", "customization"]
  },
  {
    id: "multi-channel-invites",
    question: "What communication methods are used for teen and parent invites?",
    answer: "Teen invites use multi-channel delivery with SMS via Twilio and email via SendGrid, providing reliable delivery with automatic failover. Parent invites are sent via email with secure invite codes. Both systems include professional HTML templates, setup instructions, and account creation guidance. All invite codes are secure, expire after 7 days, and can be resent if needed.",
    category: "features",
    tags: ["invites", "SMS", "email", "Twilio", "SendGrid", "delivery"]
  },
  {
    id: "voice-assistant-basics",
    question: "How does the voice-to-assistant feature work?",
    answer: "Record a voice note by clicking the microphone button. The AI transcribes your speech in real-time and analyzes it for tasks, calendar events, and reminders. You'll see smart suggestions that you can review and create with one tap. For example, saying 'Pick up groceries tomorrow and schedule Emma's dentist appointment' will suggest creating a grocery task and a calendar event.",
    category: "features",
    tags: ["voice", "ai", "assistant", "tasks", "calendar"]
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
    answer: "Go to Settings > Family and click 'Merge Families'. Enter your partner's email to send a merge request. When they accept, you'll see a billing decision dialog with three options: Keep Your Billing, Keep Their Billing, or Upgrade to Family Plan ($19.99/month). The app recommends the best option based on trial status and existing subscriptions. After merging, both parents have equal access to all family data.",
    category: "billing",
    tags: ["merge", "families", "accounts", "billing", "parents"]
  },
  {
    id: "billing-plans-overview",
    question: "What are the billing options and pricing?",
    answer: "Individual Plan: $9.99/month for 1 user with full family coordination features. Family Plan: $19.99/month for up to 4 users including teen accounts and advanced family features. Every new account gets a 14-day free trial with full access. No credit card required to start. Monthly billing only, cancel anytime.",
    category: "billing",
    tags: ["pricing", "plans", "trial", "billing", "individual", "family"]
  },
  {
    id: "trial-period",
    question: "How does the 14-day trial work?",
    answer: "Your trial starts when you create your account and gives you full access to all features for 14 days. Trial countdown is visible in Settings > Account. No credit card required to start. You can upgrade anytime during or after the trial period. Trial time remaining is preserved when upgrading or merging accounts.",
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
    question: "What's included in the premium subscription?",
    answer: "Premium includes unlimited voice notes, AI meal planning, advanced calendar integration, password vault, priority support, and upcoming features like habit tracking and allowance management. Free accounts get 10 voice notes per month and basic features.",
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
    id: "blue-light-filter",
    question: "What is the blue light filter and when should I use it?",
    answer: "The blue light filter theme reduces harsh blue light from your screen, making it easier on your eyes during evening use. Perfect for late-night planning sessions or when checking tasks before bed. This can help reduce eye strain and minimize sleep disruption from screen time.",
    category: "features",
    tags: ["blue light", "filter", "eye strain", "sleep", "wellness"]
  },
  {
    id: "theme-switching",
    question: "How do I switch between light, dark, and blue light filter themes?",
    answer: "Click the theme toggle button in the header (looks like a sun/moon icon) to cycle between light mode, dark mode, and blue light filter. Each theme is designed for different times of day and lighting conditions to optimize your comfort and eye health.",
    category: "getting-started",
    tags: ["theme", "light", "dark", "blue light", "settings"]
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
    </div>
  );
}