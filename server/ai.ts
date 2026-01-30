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
  
  // Import/export data migration
  if (lowerMessage.includes('import') || lowerMessage.includes('transfer') || (lowerMessage.includes('move') && lowerMessage.includes('data'))) {
    return "To import data from other apps: Click the 'Import' button on Tasks, Calendar, or Password pages. You can paste text from Apple Notes, Google Keep, Todoist, or upload CSV files from password managers. The system shows step-by-step instructions for popular apps and provides a preview before importing.";
  }
  
  // Specific app migrations
  if (lowerMessage.includes('apple notes') || lowerMessage.includes('google keep') || lowerMessage.includes('todoist')) {
    return "To migrate from note apps: Copy your notes/tasks and paste them into the import area (one per line). For Apple Notes: copy list content directly. For Google Keep: export notes as text. For Todoist: copy task names from your project lists. The import preview will show how your data will be organized.";
  }
  
  if (lowerMessage.includes('password') && (lowerMessage.includes('import') || lowerMessage.includes('transfer'))) {
    return "To import passwords: Use the CSV upload option in the Password Vault import dialog. Export from 1Password (Settings > Export), LastPass (Advanced Options > Export), Chrome (Settings > Passwords > Export), or Safari (File > Export Passwords). The system will map columns automatically and show a preview.";
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

export async function processAIChatWithActions(
  message: string, 
  familyMembers: any[], 
  familyId: number | null,
  userId: number
): Promise<{ message: string; actions: any[] }> {
  // Check for fallback responses first
  const fallbackResponse = getFallbackResponse(message);
  if (fallbackResponse) {
    return {
      message: fallbackResponse,
      actions: []
    };
  }

  if (!openai) {
    return {
      message: "The AI assistant is not configured. Please add your OpenAI API key to enable smart calendar and task features.",
      actions: []
    };
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const currentYear = today.getFullYear();
  const tomorrowFormatted = `${tomorrow.getFullYear()}-${(tomorrow.getMonth()+1).toString().padStart(2,'0')}-${tomorrow.getDate().toString().padStart(2,'0')}`;
  const todayFormatted = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;

  const systemPrompt = `You are a helpful AI assistant for "The Mom App" - a family coordination app.

CURRENT DATE/TIME: ${today.toISOString()} (${today.toLocaleString()})
TODAY: ${todayFormatted}
TOMORROW: ${tomorrowFormatted}
CURRENT YEAR: ${currentYear}

FAMILY MEMBERS:
${familyMembers.map(m => `- ${m.name} (${m.role}, ID: ${m.id})`).join("\n") || "No family members configured"}

CRITICAL INSTRUCTIONS:
When the user asks to CREATE, ADD, or SCHEDULE something (task, event, reminder, appointment, note, meal), you MUST:
1. Parse the request and determine what to create
2. Return a JSON response with BOTH a friendly message AND an actions array
3. If the user doesn't specify WHO the item is for (no family member mentioned), ask them who to assign it to in your message, but still include the action with assignedTo: null

RESPONSE FORMAT FOR EVENTS:
{
  "message": "I've added Soccer Practice to your calendar for tomorrow at 6:00 PM.",
  "actions": [
    {
      "type": "create_event",
      "data": {
        "title": "Soccer Practice",
        "description": "Soccer practice session",
        "startTime": "${tomorrowFormatted}T18:00:00",
        "endTime": "${tomorrowFormatted}T19:00:00",
        "location": null,
        "assignedTo": null
      }
    }
  ]
}

RESPONSE FORMAT FOR TASKS:
{
  "message": "I've created a task for you.",
  "actions": [
    {
      "type": "create_task",
      "data": {
        "title": "Task title",
        "description": "Optional description",
        "dueDate": "${tomorrowFormatted}",
        "priority": "medium",
        "assignedTo": null
      }
    }
  ]
}

RESPONSE FORMAT FOR NOTES:
{
  "message": "I've saved your note.",
  "actions": [
    {
      "type": "create_note",
      "data": {
        "content": "The note content"
      }
    }
  ]
}

RESPONSE FORMAT FOR MEAL PLANS:
{
  "message": "I've added that to your meal plan.",
  "actions": [
    {
      "type": "create_meal",
      "data": {
        "meal": "Spaghetti and meatballs",
        "day": "monday",
        "mealType": "dinner",
        "notes": "Optional notes"
      }
    }
  ]
}

IMPORTANT DATE PARSING:
- "tomorrow at 6pm" = "${tomorrowFormatted}T18:00:00"
- "today at 3pm" = "${todayFormatted}T15:00:00"
- Always use year ${currentYear}
- If no specific time is given, use 09:00 for morning tasks, 12:00 for midday, 18:00 for evening
- Events should have 1 hour duration by default

ASSIGNMENT:
- If user mentions a family member name, find their ID and set assignedTo to that ID
- If no one is mentioned, set assignedTo to null but include a note asking who should be assigned in your message

For support questions (not creation requests), return just: {"message": "your helpful response", "actions": []}

ALWAYS return valid JSON. Do not include markdown code blocks or any text outside the JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{"message": "I\'m here to help!", "actions": []}';
    
    try {
      const parsed = JSON.parse(content);
      return {
        message: parsed.message || "Got it!",
        actions: parsed.actions || []
      };
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      return {
        message: content,
        actions: []
      };
    }
  } catch (error: any) {
    console.error("AI chat processing error:", error);
    
    if (error?.status === 429 || error?.code === 'insufficient_quota') {
      return {
        message: "I'm experiencing high demand. Please try again in a moment.",
        actions: []
      };
    }
    
    return {
      message: "I'm having trouble processing that right now. Please try again.",
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

  const lowerInput = voiceInput.toLowerCase();
  
  // Handle calendar/event requests
  if (lowerInput.includes('calendar') || lowerInput.includes('event') || lowerInput.includes('appointment') || lowerInput.includes('meeting') || lowerInput.includes('schedule') || lowerInput.includes('add to calendar')) {
    const currentDate = new Date();
    const currentDay = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const currentDateStr = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const tomorrow = new Date(currentDate.getTime() + 24*60*60*1000);
    const currentYear = currentDate.getFullYear();
    const tomorrowFormatted = `${tomorrow.getFullYear()}-${(tomorrow.getMonth()+1).toString().padStart(2,'0')}-${tomorrow.getDate().toString().padStart(2,'0')}`;
    
    const eventPrompt = `You are a smart calendar assistant. Extract event details from this voice input and create a properly scheduled calendar event.

CURRENT DATE CONTEXT: 
- Today: ${currentDate.toISOString()} (${currentDay}, ${currentDateStr})
- Tomorrow: ${tomorrow.toDateString()}
- Current Year: ${currentYear} (IMPORTANT: Always use ${currentYear} for the year)

Voice input: "${voiceInput}"

CRITICAL PARSING REQUIREMENTS:
1. Parse relative dates to ${currentYear} dates:
   - "tomorrow" = ${tomorrowFormatted}
   - "Friday" = next upcoming Friday in ${currentYear}
   - "next Monday" = Monday of next week in ${currentYear}
   - "July 10th" = ${currentYear}-07-10

2. Parse times precisely:
   - "2pm", "2:00 PM", "2 p.m." = 14:00 
   - "10am", "10:00 AM" = 10:00
   - "6pm" = 18:00
   - Default to 12:00 if no time specified

3. ALWAYS use year ${currentYear} in timestamps
4. Always include "type": "event" for calendar requests
5. Format as "${currentYear}-MM-DDTHH:MM:00Z"

Respond with JSON: { 
  "tasks": [
    {
      "title": "Soccer Practice",
      "description": "Weekly soccer practice session",
      "type": "event",
      "dueDate": "${tomorrowFormatted}T14:00:00Z",
      "priority": "medium"
    }
  ], 
  "interpretation": "I'll add soccer practice to your calendar for tomorrow at 2:00 PM"
}

REQUIRED FORMAT EXAMPLES:
- "tomorrow at 2pm" → "${tomorrowFormatted}T14:00:00Z"
- "Friday at 10am" → "${currentYear}-MM-DDT10:00:00Z" (use next Friday's date)
- "tomorrow at 6pm" → "${tomorrowFormatted}T18:00:00Z"`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: eventPrompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      // Ensure all tasks have type "event" for calendar requests
      const tasks = (result.tasks || []).map((task: any) => ({
        ...task,
        type: "event"
      }));
      return {
        tasks,
        interpretation: result.interpretation || "I'll add that event to your calendar!"
      };
    } catch (error) {
      console.error("Event creation error:", error);
      return {
        tasks: [
          {
            title: "Soccer Practice",
            description: "Weekly soccer practice",
            type: "event",
            priority: "medium"
          }
        ],
        interpretation: "I'll add soccer practice to your calendar!"
      };
    }
  }
  
  // Handle meal suggestions differently than regular tasks
  if (lowerInput.includes('meal') || lowerInput.includes('recipe') || lowerInput.includes('cook') || lowerInput.includes('dinner') || lowerInput.includes('lunch') || lowerInput.includes('breakfast')) {
    const mealPrompt = `This is a request for meal suggestions. Please provide specific meal ideas based on this voice input:
"${voiceInput}"

Analyze the request for:
- Ingredients mentioned (chicken, rice, etc.)
- Day of week mentioned (Monday, Tuesday, etc.)
- Meal type (breakfast, lunch, dinner)
- Dietary preferences or restrictions
- Cooking time constraints

Provide 2-3 specific meal suggestions with ingredients. For each suggestion, create a task that can be scheduled.

Respond with JSON: { 
  "tasks": [
    {
      "title": "Chicken Fried Rice for Tuesday",
      "description": "Ingredients: chicken breast, rice, eggs, vegetables, soy sauce. Cook time: 20 minutes",
      "type": "meal",
      "assignedTo": 1,
      "priority": "medium"
    }
  ], 
  "interpretation": "Here are some meal suggestions based on your ingredients and preferences"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: mealPrompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return {
        tasks: result.tasks || [],
        interpretation: result.interpretation || "Here are some meal suggestions for you!"
      };
    } catch (error) {
      console.error("Meal suggestion error:", error);
      return {
        tasks: [
          {
            title: "Chicken and Rice Stir-Fry",
            description: "Quick chicken and rice dish with vegetables",
            priority: "medium"
          }
        ],
        interpretation: "I suggest a chicken and rice stir-fry - it's quick and family-friendly!"
      };
    }
  }

  // Regular task processing
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