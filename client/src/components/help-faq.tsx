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
    id: "voice-notes-accuracy",
    question: "How accurate is the voice-to-task conversion?",
    answer: "Our AI processes natural speech with high accuracy. It understands family context like names, relationships, and common household tasks. If a task isn't captured correctly, you can always edit it before saving. The system learns from your corrections to improve over time.",
    category: "features",
    tags: ["voice", "ai", "accuracy", "tasks"]
  },
  {
    id: "family-member-setup",
    question: "How do I add family members?",
    answer: "Go to Settings > Family Settings to add family members. Include their name, role (mom, dad, child), and assign them a color for easy identification. Each member can have their own notification preferences and task assignments.",
    category: "getting-started",
    tags: ["family", "setup", "members", "colors"]
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