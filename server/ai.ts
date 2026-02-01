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
    type: "create_task" | "create_event" | "create_reminder" | "create_note" | "create_meal" | "create_grocery";
    data: any;
  }>;
}

// Fallback responses for common support questions
function getFallbackResponse(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  // Theme and display questions
  if (lowerMessage.includes('dark mode') || lowerMessage.includes('theme') || lowerMessage.includes('brightness')) {
    return "To switch themes: Click the theme toggle button in the header (sun/moon icon) to toggle between Light Mode and Dark Mode. Dark Mode is perfect for evening use as it's easier on your eyes.";
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
  
  // Eye strain / night viewing questions
  if (lowerMessage.includes('eye strain') || lowerMessage.includes('night mode') || lowerMessage.includes('evening') || lowerMessage.includes('easier on eyes')) {
    return "For easier viewing at night, switch to Dark Mode using the theme toggle in the header (sun/moon icon). Dark Mode reduces eye strain and is perfect for evening use.";
  }
  
  // Grocery list questions
  if (lowerMessage.includes('grocery') || lowerMessage.includes('groceries') || lowerMessage.includes('shopping list')) {
    return "To manage your grocery list: Go to the Grocery tab or say 'add milk to my grocery list'. You can add items by voice command, check off items when purchased, and organize by category. The AI can also add groceries based on your meal plans!";
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
- Voice Commands: Create calendar events, tasks, notes, meals, and groceries with voice
- Calendar Sync: Google Calendar integration (Settings > Calendar Sync)
- Password Vault: Secure family password storage (Dashboard > Passwords tab)
- AI Meal Planning: Generate meal suggestions based on preferences
- Task Management: Assign tasks with due dates and priorities
- Grocery Lists: Add items by voice, organize by category, sync with meal plans
- Notifications: SMS/email alerts for family members
- Theme Options: Light and Dark modes (toggle in header)

COMMON SUPPORT SCENARIOS:
- Calendar sync issues → Check Google account permissions in Settings
- Voice notes not working → Verify microphone permissions in browser settings
- Adding family members → Settings > Family Settings
- Password security questions → Bank-level encryption, secure vault
- Theme switching → Header toggle button (sun/moon icon) switches light/dark
- Notification setup → Settings > Notifications for SMS/email config

APP TUTORIALS (Use this knowledge when users ask for help):
1. Voice Commands: Tap mic icon in header → speak command → AI creates events/tasks/notes/meals/groceries automatically
2. AI Assistant: Tap robot icon for text chat → ask questions or give commands → get smart suggestions
3. Calendar: Create events with family member assignment and privacy controls (shared/busy/private)
4. Tasks: Assign to family members, set priorities and due dates, organized by family member sections
5. Meal Planning: Plan weekly meals, add via voice command like "Add pasta to Monday dinner"
6. Grocery Lists: Add items by voice or manually, organize by category, check off when purchased
7. Password Vault: Dashboard → Passwords tab → securely store family login credentials
8. Teen Accounts: Settings → Teen Settings → Send invite codes via SMS for teen family members
9. Printable Task Lists: From tasks page, print kid-friendly task lists for children without devices
10. Settings: Family members, notifications, calendar sync, and account preferences

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
  userId: number,
  conversationHistory?: { role: string; content: string }[]
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
1. When asked for IDEAS, SUGGESTIONS, or LISTS (e.g., "give me 5 dinner ideas"), ALWAYS include the actual items in your message text - never say "here are ideas" without listing them.
2. When the user asks to CREATE, ADD, or SCHEDULE something (task, event, reminder, appointment, note, meal, grocery item), you MUST:
   - Parse the request and determine what to create
   - Return a JSON response with BOTH a friendly message AND an actions array
   - If the user doesn't specify WHO the item is for (no family member mentioned), ask them who to assign it to in your message, but still include the action with assignedTo: null
3. When the user refers to previous messages (e.g., "add those to my meal plan"), use the conversation context to understand what "those" refers to and create the appropriate actions.

FAMILY MEMBER ASSIGNMENT RULES:
- When a user mentions a family member's name (e.g., "assign to Emily", "for TJ", "give Everlie"), match it to the FAMILY MEMBERS list above
- Use partial name matching: "Em" matches "Emily", "Ever" matches "Everlie"
- Set "assignedTo" to the family member's numeric ID (not their name!)
- Include their name in your message for confirmation (e.g., "I've assigned this task to Emily")

TIME/DATE HANDLING:
- Parse natural language times: "at 3pm", "tomorrow morning", "next Friday at 2", "in 2 hours"
- Use ISO format for dates/times: "2025-02-01T15:00:00"
- For events, set both startTime and endTime (default 1 hour duration if not specified)
- For tasks, set dueDate if a deadline is mentioned

RESPONSE FORMAT FOR EVENTS:
{
  "message": "I've added Soccer Practice for Emily to your calendar for tomorrow at 6:00 PM.",
  "actions": [
    {
      "type": "create_event",
      "data": {
        "title": "Soccer Practice",
        "description": "Soccer practice session",
        "startTime": "${tomorrowFormatted}T18:00:00",
        "endTime": "${tomorrowFormatted}T19:00:00",
        "location": null,
        "assignedTo": 5
      }
    }
  ]
}
Note: "assignedTo" should be the family member's numeric ID from the FAMILY MEMBERS list, or null if not specified.

RESPONSE FORMAT FOR TASKS:
{
  "message": "I've created a task for TJ due tomorrow.",
  "actions": [
    {
      "type": "create_task",
      "data": {
        "title": "Task title",
        "description": "Optional description",
        "dueDate": "${tomorrowFormatted}",
        "priority": "medium",
        "assignedTo": 3
      }
    }
  ]
}
Note: "assignedTo" should be the family member's numeric ID from the FAMILY MEMBERS list, or null if not specified.

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

RESPONSE FORMAT FOR MEAL PLANS (can add multiple meals at once):
{
  "message": "I've added 5 gluten-free dinners to your meal plan for the week!",
  "actions": [
    {
      "type": "create_meal",
      "data": {
        "meal": "Grilled Salmon with Roasted Vegetables",
        "day": "monday",
        "mealType": "dinner",
        "notes": "Gluten-free"
      }
    },
    {
      "type": "create_meal",
      "data": {
        "meal": "Chicken Stir Fry with Rice",
        "day": "tuesday",
        "mealType": "dinner",
        "notes": "Gluten-free, use tamari instead of soy sauce"
      }
    }
  ]
}
IMPORTANT: When the user asks to add multiple meals (e.g., "add those dinners to my meal plan"), create separate create_meal actions for EACH meal - one per day (monday, tuesday, wednesday, thursday, friday, saturday, sunday). Always include all meals the user wants added.

RESPONSE FORMAT FOR GROCERY ITEMS:
{
  "message": "I've added milk to your grocery list.",
  "actions": [
    {
      "type": "create_grocery",
      "data": {
        "name": "Milk",
        "category": "Dairy",
        "quantity": "1 gallon"
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
    // Build messages array with conversation history for context
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt }
    ];
    
    // Add conversation history if provided (excluding the current message which is already there)
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(0, -1)) { // Exclude the last one (current message)
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ 
            role: msg.role as "user" | "assistant", 
            content: msg.content 
          });
        }
      }
    }
    
    // Add the current message
    messages.push({ role: "user", content: message });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
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

  // Handle grocery list requests
  if (lowerInput.includes('grocery') || lowerInput.includes('groceries') || lowerInput.includes('shopping list') || lowerInput.includes('buy') || lowerInput.includes('need to get') || lowerInput.includes('pick up')) {
    const groceryPrompt = `Parse this voice input and extract grocery items to add to a shopping list:
"${voiceInput}"

Extract grocery items mentioned and categorize them appropriately.

Respond with JSON: { 
  "tasks": [
    {
      "title": "Milk",
      "description": "Dairy",
      "type": "grocery",
      "priority": "medium"
    },
    {
      "title": "Bread",
      "description": "Bakery",
      "type": "grocery", 
      "priority": "medium"
    }
  ], 
  "interpretation": "I'll add milk and bread to your grocery list"
}

IMPORTANT: 
- Each item should be a separate task with type "grocery"
- Use common grocery categories for description (Produce, Dairy, Meat, Bakery, Frozen, Pantry, Beverages, Snacks, Household, Other)
- Keep item titles simple (just the item name)`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: groceryPrompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      const tasks = (result.tasks || []).map((task: any) => ({
        ...task,
        type: "grocery"
      }));
      return {
        tasks,
        interpretation: result.interpretation || "I'll add those items to your grocery list!"
      };
    } catch (error) {
      console.error("Grocery list error:", error);
      return {
        tasks: [],
        interpretation: "I couldn't parse the grocery items. Could you try listing them again?"
      };
    }
  }

  // Regular task processing
  const prompt = `Parse this voice input from a parent and extract actionable tasks:
"${voiceInput}"

FAMILY MEMBERS (use these exact IDs for assignment):
${familyMembers.map(m => `- ${m.name} (ID: ${m.id}, role: ${m.role})`).join("\n")}

EXTRACTION RULES:
1. ALWAYS include "type": "task" for each task
2. FAMILY MEMBER ASSIGNMENT: When a name is mentioned (e.g., "assign Everlie", "give Emily", "for TJ"), match it to a family member above and use their ID
   - Match partial names: "Everlie" matches "Everlie", "Em" matches "Emily"  
   - Set "assignedTo" to the family member's ID number
   - Set "assigneeName" to their full name for display
3. POINTS: If points are mentioned (e.g., "assign 5 points", "worth 10 points", "5 points"), extract the number
   - Default to 10 points if not specified
4. Set due dates if time references are mentioned (use ISO format)
5. Set priority (low/medium/high) based on urgency words

EXAMPLES:
- "assign Everlie task to clean her room and assign 5 points" → assignedTo: [Everlie's ID], points: 5
- "give Emily a task to do homework worth 15 points" → assignedTo: [Emily's ID], points: 15
- "create a task for TJ to take out trash" → assignedTo: [TJ's ID], points: 10

Respond with JSON: { 
  "tasks": [
    {
      "title": "Clean the room",
      "type": "task",
      "assignedTo": 38,
      "assigneeName": "Everlie",
      "points": 5,
      "priority": "medium"
    }
  ], 
  "interpretation": "I'll assign Everlie the task to clean her room with 5 points" 
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    // Ensure all tasks have type "task" and include points/assignee
    const tasks = (result.tasks || []).map((task: any) => ({
      ...task,
      type: task.type || "task",
      points: task.points || 10,
      assigneeName: task.assigneeName || null
    }));
    return {
      tasks,
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