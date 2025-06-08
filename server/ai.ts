import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export interface AIRequest {
  message: string;
  familyContext?: {
    members: Array<{ id: number; name: string; role: string }>;
    upcomingEvents: Array<{ title: string; startTime: Date; assignedTo?: number }>;
    pendingTasks: Array<{ title: string; assignedTo?: number; dueDate?: Date }>;
  };
}

export interface AIResponse {
  message: string;
  actions?: Array<{
    type: "create_task" | "create_event" | "create_reminder" | "add_to_meal_plan";
    data: any;
  }>;
}

// Fallback responses for common support questions
function getFallbackResponse(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  // Theme and display questions
  if (lowerMessage.includes('dark mode') || lowerMessage.includes('theme') || lowerMessage.includes('brightness')) {
    return "To switch themes: Click the theme toggle button in the header (sun/moon icon). You can choose between Light Mode, Dark Mode, and Blue Light Filter. The Blue Light Filter is perfect for evening use as it reduces eye strain and helps maintain better sleep patterns.";
  }
  
  // Google Calendar sync questions
  if (lowerMessage.includes('google') && (lowerMessage.includes('sync') || lowerMessage.includes('calendar'))) {
    return "To sync Google Calendar: Go to Settings > Calendar Sync and click 'Connect Google Calendar'. Sign in with your Google account, grant permissions, then choose your sync preferences (import only, export only, or two-way sync). You can select which calendars to sync and enable automatic updates.";
  }
  
  // Voice notes troubleshooting
  if (lowerMessage.includes('voice') && (lowerMessage.includes('not working') || lowerMessage.includes('problem') || lowerMessage.includes('issue'))) {
    return "For voice note issues: 1) Check microphone permissions in your browser settings, 2) Ensure you're using a supported browser (Chrome, Safari, Edge), 3) Try refreshing the page, 4) Make sure no other apps are using your microphone. The voice-to-task feature converts your speech into organized tasks automatically.";
  }
  
  // Password vault questions
  if (lowerMessage.includes('password') && (lowerMessage.includes('vault') || lowerMessage.includes('security') || lowerMessage.includes('how to'))) {
    return "To use Password Vault: From the dashboard, click the 'Passwords' tab. Add new passwords by clicking the '+' button. Organize them using categories like 'Kids', 'Banking', or 'Entertainment'. Mark frequently used ones as favorites. All passwords are encrypted with bank-level security - only you have access with your master password.";
  }
  
  // Notifications setup
  if (lowerMessage.includes('notification') || (lowerMessage.includes('sms') || lowerMessage.includes('email')) && lowerMessage.includes('setup')) {
    return "To set up notifications: Go to Settings > Notifications. Add phone numbers for SMS alerts and email addresses for each family member. You can customize notification types, timing, and frequency. Family members will receive alerts about their assigned tasks and upcoming events.";
  }
  
  // Adding family members
  if (lowerMessage.includes('add') && (lowerMessage.includes('family') || lowerMessage.includes('member'))) {
    return "To add family members: Go to Settings > Family Settings. Click 'Add Member' and enter their name, role (mom, dad, child), and assign a color for easy identification. Each member can have their own task assignments and notification preferences.";
  }
  
  // Blue light filter specific
  if (lowerMessage.includes('blue light') || lowerMessage.includes('filter') || lowerMessage.includes('eye strain')) {
    return "The Blue Light Filter reduces harsh blue light from your screen, making it easier on your eyes during evening use. Access it through the theme toggle button in the header. It's perfect for late-night planning sessions and helps reduce sleep disruption from screen time.";
  }
  
  return null;
}

export async function processAIRequest(request: AIRequest): Promise<AIResponse> {
  // Check for fallback responses first
  const fallbackResponse = getFallbackResponse(request.message);
  if (fallbackResponse) {
    return {
      message: fallbackResponse,
      actions: []
    };
  }
  
  // If no OpenAI key is available, provide helpful guidance to connect
  if (!openai) {
    return {
      message: "To enable the AI assistant, please add your OpenAI API key to the environment variables. The AI can help with smart task creation, meal planning, schedule optimization, and family coordination. Once connected, I'll be able to understand your family context and provide personalized assistance.",
      actions: []
    };
  }

  const systemPrompt = `You are a helpful AI assistant for "The Mom App" - a family command center that helps busy parents manage household coordination.

DUAL ROLE:
1. FAMILY COORDINATOR: Help with family planning, tasks, meals, and household organization
2. APP SUPPORT SPECIALIST: Answer questions about app features, troubleshooting, and usage guidance

FAMILY CONTEXT:
${request.familyContext ? `
Family Members: ${request.familyContext.members.map(m => `${m.name} (${m.role})`).join(", ")}

Upcoming Events: ${request.familyContext.upcomingEvents.map(e => 
  `${e.title} - ${e.startTime.toLocaleDateString()}`
).join(", ") || "None"}

Pending Tasks: ${request.familyContext.pendingTasks.map(t => 
  `${t.title}${t.dueDate ? ` (due ${t.dueDate.toLocaleDateString()})` : ""}`
).join(", ") || "None"}
` : "No family context available"}

APP FEATURES FOR SUPPORT:
- Voice Notes: Convert speech to tasks automatically
- Calendar Sync: Google Calendar integration (Settings > Calendar Sync)
- Password Vault: Secure family password storage (Dashboard > Passwords tab)
- AI Meal Planning: Generate meal suggestions based on preferences
- Task Management: Assign tasks with due dates and priorities
- Mindful Usage & Blue Light Filter: Healthy screen time features
- Notifications: SMS/email alerts for family members
- Theme Options: Light, dark, and blue light filter modes

COMMON SUPPORT SCENARIOS:
- Calendar sync issues → Check Google account permissions in Settings
- Voice notes not working → Verify microphone permissions
- Adding family members → Settings > Family Settings
- Password security questions → Bank-level encryption, master password only
- Theme switching → Header toggle button cycles through options
- Notification setup → Settings > Notifications for SMS/email config

RESPONSE APPROACH:
- For family coordination: Provide practical, personalized suggestions using family context
- For app support: Give specific step-by-step instructions
- Be conversational and supportive like a helpful family assistant
- Keep responses concise but warm
- Use family member names when relevant for coordination tasks

If the user wants to create tasks, events, or reminders, include them in your response but also provide the natural language response.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.message }
      ],
    });

    const content = response.choices[0].message.content || "I'm here to help with your family coordination!";
    
    return {
      message: content,
      actions: []
    };
  } catch (error: any) {
    console.error("AI processing error:", error);
    
    // Handle quota exceeded or rate limiting
    if (error?.status === 429 || error?.code === 'insufficient_quota') {
      return {
        message: "I'm currently experiencing high demand. For immediate help with app features, please check the FAQ section in tutorials or ask me specific questions about using The Mom App - I have built-in knowledge about themes, calendar sync, password vault, voice notes, and notifications.",
        actions: []
      };
    }
    
    return {
      message: "I'm having trouble processing that request right now. For app support questions, try asking about specific features like 'dark mode', 'google calendar', 'password vault', or 'voice notes' - I have built-in help for common topics.",
      actions: []
    };
  }
}

export async function generateMealSuggestions(preferences: {
  dietary?: string[];
  cookingTime?: string;
  familySize?: number;
  kidFriendly?: boolean;
}): Promise<string[]> {
  if (!openai) {
    return ["Spaghetti with marinara", "Chicken stir fry", "Tacos", "Grilled cheese and soup", "Baked chicken with vegetables"];
  }

  const prompt = `Suggest 5 family-friendly meal ideas based on these preferences:
- Dietary restrictions: ${preferences.dietary?.join(", ") || "None"}
- Cooking time: ${preferences.cookingTime || "Any"}
- Family size: ${preferences.familySize || "4"} people
- Kid-friendly: ${preferences.kidFriendly ? "Yes" : "No preference"}

Return as JSON array of meal names only.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.meals || [];
  } catch (error) {
    console.error("Meal suggestion error:", error);
    return ["Spaghetti with marinara", "Chicken stir fry", "Tacos", "Grilled cheese and soup", "Baked chicken with vegetables"];
  }
}

export async function smartTaskCreation(voiceInput: string, familyMembers: Array<{ id: number; name: string; role: string }>): Promise<{
  tasks: Array<{ title: string; assignedTo?: number; dueDate?: Date; priority: string }>;
  interpretation: string;
}> {
  if (!openai) {
    return {
      tasks: [],
      interpretation: "Smart task creation requires OpenAI API key. Please add your key to enable this feature."
    };
  }

  const prompt = `Parse this voice input from a parent and extract actionable tasks:
"${voiceInput}"

Family members available for assignment: ${familyMembers.map(m => `${m.name} (ID: ${m.id})`).join(", ")}

Extract specific tasks with:
- Clear task titles
- Assign to family members when mentioned by name
- Set due dates if time references are mentioned
- Set priority (low/medium/high) based on urgency

Respond with JSON: { "tasks": [...], "interpretation": "friendly summary of what I understood" }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      tasks: result.tasks || [],
      interpretation: result.interpretation || "I'll help you organize those tasks!"
    };
  } catch (error) {
    console.error("Smart task creation error:", error);
    return {
      tasks: [],
      interpretation: "I couldn't parse that request. Could you try being more specific?"
    };
  }
}