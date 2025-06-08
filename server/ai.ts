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

export async function processAIRequest(request: AIRequest): Promise<AIResponse> {
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
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.message }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      message: result.message || "I'm here to help with your family coordination!",
      actions: result.actions || []
    };
  } catch (error) {
    console.error("AI processing error:", error);
    return {
      message: "I'm having trouble processing that request right now. Could you try rephrasing it?",
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