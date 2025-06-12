import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSession, requireAuth, getCurrentUser, hashPassword, verifyPassword, generateToken } from "./auth";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { processAIRequest, generateMealSuggestions, smartTaskCreation } from "./ai";
import { 
  insertEventSchema,
  insertTaskSchema,
  insertVoiceNoteSchema,
  insertDeadlineSchema,
  insertNotificationSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup session middleware
  setupSession(app);

  // Health check endpoint for mobile connectivity testing
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      server: "replit",
      version: "2.2"
    });
  });
  
  // Authentication Routes
  app.post("/api/register", async (req, res) => {
    try {
      const registrationSchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        familyName: z.string().min(1),
      });
      
      const validatedData = registrationSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      
      // Hash password
      const passwordHash = await hashPassword(validatedData.password);
      
      // Create user
      const user = await storage.createUser({
        email: validatedData.email,
        passwordHash,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });
      
      // Create family
      const family = await storage.createFamily({
        name: validatedData.familyName,
        ownerId: user.id,
      });
      
      // Create family membership
      await storage.createFamilyMembership({
        userId: user.id,
        familyId: family.id,
        role: "owner",
      });
      
      // Login user
      req.session!.userId = user.id;
      
      // Return user without password
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Registration failed" });
    }
  });
  
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      
      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Login user - ensure session is created
      req.session!.userId = user.id;
      
      // Save session explicitly for mobile compatibility
      await new Promise<void>((resolve, reject) => {
        req.session!.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      console.log("Login successful for user:", user.id, "Session ID:", req.session?.id);
      
      // Generate JWT token for mobile compatibility
      const token = generateToken(user.id);
      
      // Set token as HTTP-only cookie for web browsers
      res.cookie('auth_token', token, {
        httpOnly: false, // Allow client access for mobile apps
        secure: false, // Keep false for development/mobile
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      // Return user without password and include token
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword,
        token: token // Include token in response for mobile apps
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  app.post("/api/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/user", async (req, res) => {
    try {
      console.log("Auth check - Session ID:", req.session?.id, "User ID:", req.session?.userId);
      
      const user = await getCurrentUser(req);
      if (!user) {
        console.log("No user found in session");
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      console.log("User authenticated:", user.id);
      
      // Return user without password
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  
  // Family Members
  app.get("/api/family-members", async (req, res) => {
    try {
      const members = await storage.getFamilyMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });

  // Events
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/today", async (req, res) => {
    try {
      const events = await storage.getTodayEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's events" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid event data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create event" });
      }
    }
  });

  // Tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/today", async (req, res) => {
    try {
      const tasks = await storage.getTasksForToday();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's tasks" });
    }
  });

  app.get("/api/tasks/pending", async (req, res) => {
    try {
      const tasks = await storage.getPendingTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid task data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create task" });
      }
    }
  });

  // Events
  app.post("/api/events", async (req, res) => {
    try {
      // Convert date strings to Date objects if needed
      const eventData = { ...req.body };
      if (eventData.startTime && typeof eventData.startTime === 'string') {
        eventData.startTime = new Date(eventData.startTime);
      }
      if (eventData.endTime && typeof eventData.endTime === 'string') {
        eventData.endTime = new Date(eventData.endTime);
      }
      
      const validatedData = insertEventSchema.parse(eventData);
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid event data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create event" });
      }
    }
  });

  app.put("/api/events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const eventData = { ...req.body };
      
      // Convert date strings to Date objects if needed
      if (eventData.startTime && typeof eventData.startTime === 'string') {
        eventData.startTime = new Date(eventData.startTime);
      }
      if (eventData.endTime && typeof eventData.endTime === 'string') {
        eventData.endTime = new Date(eventData.endTime);
      }
      
      const validatedData = insertEventSchema.parse(eventData);
      const event = await storage.updateEvent(eventId, validatedData);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid event data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update event" });
      }
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const deleted = await storage.deleteEvent(eventId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.patch("/api/tasks/:id/complete", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { completedBy } = req.body;
      
      if (!completedBy || typeof completedBy !== 'number') {
        return res.status(400).json({ message: "completedBy is required and must be a number" });
      }

      const task = await storage.completeTask(taskId, completedBy);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Voice Notes
  app.get("/api/voice-notes", async (req, res) => {
    try {
      const notes = await storage.getVoiceNotes();
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch voice notes" });
    }
  });

  app.get("/api/voice-notes/recent", async (req, res) => {
    try {
      const notes = await storage.getRecentVoiceNotes();
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent voice notes" });
    }
  });

  app.post("/api/voice-notes", async (req, res) => {
    try {
      const validatedData = insertVoiceNoteSchema.parse(req.body);
      const note = await storage.createVoiceNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid voice note data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create voice note" });
      }
    }
  });

  // Deadlines
  app.get("/api/deadlines", async (req, res) => {
    try {
      const deadlines = await storage.getDeadlines();
      res.json(deadlines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deadlines" });
    }
  });

  app.get("/api/deadlines/upcoming", async (req, res) => {
    try {
      const deadlines = await storage.getUpcomingDeadlines();
      res.json(deadlines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming deadlines" });
    }
  });

  app.post("/api/deadlines", async (req, res) => {
    try {
      const validatedData = insertDeadlineSchema.parse(req.body);
      const deadline = await storage.createDeadline(validatedData);
      res.status(201).json(deadline);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid deadline data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create deadline" });
      }
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const [todayTasks, todayEvents, allTasks] = await Promise.all([
        storage.getTasksForToday(),
        storage.getTodayEvents(),
        storage.getTasks()
      ]);

      const completedTasks = allTasks.filter(task => task.isCompleted).length;
      const totalTasks = allTasks.length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      res.json({
        todayTasks: todayTasks.filter(task => !task.isCompleted).length,
        todayEvents: todayEvents.length,
        weeklyTasksCompletion: completionRate,
        familyEventsAttended: 100 // Mock data as requested in design
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const recipientId = req.query.recipientId ? parseInt(req.query.recipientId as string) : undefined;
      const notifications = await storage.getNotifications(recipientId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/pending", async (req, res) => {
    try {
      const notifications = await storage.getPendingNotifications();
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid notification data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create notification" });
      }
    }
  });

  app.patch("/api/notifications/:id/sent", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationSent(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as sent" });
    }
  });

  // Enhanced task creation with automatic notification
  app.post("/api/tasks/with-notification", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      if ('createTaskWithNotification' in storage) {
        const task = await (storage as any).createTaskWithNotification(validatedData);
        res.status(201).json(task);
      } else {
        // Fallback to regular task creation
        const task = await storage.createTask(validatedData);
        res.status(201).json(task);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid task data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create task with notification" });
      }
    }
  });

  // AI Assistant Routes
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message } = req.body;
      
      // Get family context for AI
      const familyMembers = await storage.getFamilyMembers();
      const upcomingEvents = await storage.getEvents();
      const pendingTasks = await storage.getPendingTasks();
      
      const response = await processAIRequest({
        message,
        familyContext: {
          members: familyMembers.map(m => ({ id: m.id, name: m.name, role: m.role })),
          upcomingEvents: upcomingEvents.map(e => ({ 
            title: e.title, 
            startTime: e.startTime, 
            assignedTo: e.assignedTo ?? undefined 
          })),
          pendingTasks: pendingTasks.map(t => ({ 
            title: t.title, 
            assignedTo: t.assignedTo ?? undefined, 
            dueDate: t.dueDate ?? undefined 
          }))
        }
      });
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to process AI request" });
    }
  });

  // Helper function to parse events from voice commands
  function parseEventFromVoice(message: string) {
    const lowerMessage = message.toLowerCase();
    
    // Extract title
    let title = message;
    if (lowerMessage.includes('schedule ')) {
      title = message.substring(message.toLowerCase().indexOf('schedule ') + 9);
    } else if (lowerMessage.includes('create ') && lowerMessage.includes('event')) {
      title = message.substring(message.toLowerCase().indexOf('create ') + 7).replace(/event/i, '').trim();
    }
    
    // Extract time information
    const now = new Date();
    let startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to tomorrow
    
    // Enhanced time parsing for AM/PM format
    const timeMatch = message.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    const time24Match = message.match(/(\d{1,2}):(\d{2})/);
    
    let parsedHour = 9; // Default to 9 AM
    let parsedMinute = 0;
    let hasTimeInfo = false;
    
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const modifier = timeMatch[3].toLowerCase();
      
      if (modifier === 'pm' && hour !== 12) {
        parsedHour = hour + 12;
      } else if (modifier === 'am' && hour === 12) {
        parsedHour = 0;
      } else {
        parsedHour = hour;
      }
      parsedMinute = minute;
      hasTimeInfo = true;
    } else if (time24Match) {
      parsedHour = parseInt(time24Match[1]);
      parsedMinute = parseInt(time24Match[2]);
      hasTimeInfo = true;
    }
    
    // Extract date information and apply time
    if (lowerMessage.includes('today')) {
      const todayDate = new Date();
      startTime = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
      if (hasTimeInfo) {
        startTime.setHours(parsedHour, parsedMinute, 0, 0);
      } else {
        startTime = new Date(todayDate.getTime() + 60 * 60 * 1000); // 1 hour from now
      }
    } else if (lowerMessage.includes('tomorrow')) {
      const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      startTime = new Date(tomorrowDate.getFullYear(), tomorrowDate.getMonth(), tomorrowDate.getDate());
      if (hasTimeInfo) {
        startTime.setHours(parsedHour, parsedMinute, 0, 0);
      } else {
        startTime.setHours(parsedHour, parsedMinute, 0, 0); // Default to 9 AM
      }
    } else if (hasTimeInfo) {
      // Time specified but no date, default to today if time is in future, otherwise tomorrow
      const todayWithTime = new Date();
      todayWithTime.setHours(parsedHour, parsedMinute, 0, 0);
      
      if (todayWithTime > now) {
        startTime = todayWithTime;
      } else {
        const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        startTime = new Date(tomorrowDate.getFullYear(), tomorrowDate.getMonth(), tomorrowDate.getDate());
        startTime.setHours(parsedHour, parsedMinute, 0, 0);
      }
    }
    
    return {
      title: title.trim(),
      description: `Created via voice command: "${message}"`,
      startTime,
      endTime: new Date(startTime.getTime() + 60 * 60 * 1000), // 1 hour duration
      isAllDay: false,
      assignedTo: 1 // Default to first family member
    };
  }

  // Helper function to parse tasks from voice commands
  function parseTaskFromVoice(message: string) {
    const lowerMessage = message.toLowerCase();
    
    // Extract title
    let title = message;
    if (lowerMessage.includes('add ')) {
      title = message.substring(message.toLowerCase().indexOf('add ') + 4);
    } else if (lowerMessage.includes('create ')) {
      title = message.substring(message.toLowerCase().indexOf('create ') + 7);
    } else if (lowerMessage.includes('remind me to ')) {
      title = message.substring(message.toLowerCase().indexOf('remind me to ') + 13);
    }
    
    // Clean up title
    title = title.replace(/to my task list|to tasks|task/gi, '').trim();
    
    // Set due date if mentioned
    const now = new Date();
    let dueDate = null;
    
    if (lowerMessage.includes('today')) {
      dueDate = new Date();
      dueDate.setHours(23, 59, 59, 999);
    } else if (lowerMessage.includes('tomorrow')) {
      dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      dueDate.setHours(23, 59, 59, 999);
    }
    
    return {
      title: title.trim(),
      description: `Created via voice command: "${message}"`,
      dueDate,
      priority: "medium",
      assignedTo: 1, // Default to first family member
      isCompleted: false
    };
  }

  // Voice command processing endpoint
  app.post("/api/ai/voice-command", async (req, res) => {
    try {
      const { message } = req.body;
      const lowerMessage = message.toLowerCase();
      const actions = [];
      
      // Get fresh family context
      const familyMembers = await storage.getFamilyMembers();
      const upcomingEvents = await storage.getEvents();
      const pendingTasks = await storage.getPendingTasks();
      
      // Smart parsing for direct voice commands
      if (lowerMessage.includes('schedule') || lowerMessage.includes('appointment') || 
          lowerMessage.includes('event') || lowerMessage.includes('meeting')) {
        try {
          const eventData = parseEventFromVoice(message);
          const event = await storage.createEvent(eventData);
          actions.push({
            type: "create_event",
            data: event
          });
        } catch (error) {
          console.error('Event creation failed:', error);
        }
      }
      
      if (lowerMessage.includes('add') && (lowerMessage.includes('task') || lowerMessage.includes('todo') || 
          lowerMessage.includes('remind me to'))) {
        try {
          const taskData = parseTaskFromVoice(message);
          const task = await storage.createTask(taskData);
          actions.push({
            type: "create_task",
            data: task
          });
        } catch (error) {
          console.error('Task creation failed:', error);
        }
      }
      
      // If specific actions were created, return success
      if (actions.length > 0) {
        const responseMessage = actions.length === 1 
          ? `Created ${actions[0].type.replace('create_', '').replace('_', ' ')}: ${actions[0].data.title}`
          : `Created ${actions.length} items from your voice command`;
          
        return res.json({
          message: responseMessage,
          actions
        });
      }
      
      // Otherwise, use AI processing for general queries
      const response = await processAIRequest({
        message: `Voice command: ${message}`,
        familyContext: {
          members: familyMembers.map(m => ({ id: m.id, name: m.name, role: m.role })),
          upcomingEvents: upcomingEvents.map(e => ({ 
            title: e.title, 
            startTime: e.startTime, 
            assignedTo: e.assignedTo ?? undefined 
          })),
          pendingTasks: pendingTasks.map(t => ({ 
            title: t.title, 
            assignedTo: t.assignedTo ?? undefined, 
            dueDate: t.dueDate ?? undefined 
          }))
        }
      });

      // Execute any actions suggested by AI
      if (response.actions) {
        for (const action of response.actions) {
          try {
            switch (action.type) {
              case "create_task":
                await storage.createTask({
                  title: action.data.title,
                  description: action.data.description || "",
                  assignedTo: action.data.assignedTo || 1,
                  dueDate: action.data.dueDate ? new Date(action.data.dueDate) : undefined,
                  priority: action.data.priority || "medium",
                  isCompleted: false
                });
                break;
              case "create_event":
                await storage.createEvent({
                  title: action.data.title,
                  description: action.data.description || "",
                  startTime: new Date(action.data.startTime),
                  endTime: action.data.endTime ? new Date(action.data.endTime) : new Date(new Date(action.data.startTime).getTime() + 60 * 60 * 1000),
                  assignedTo: action.data.assignedTo || 1,
                  location: action.data.location || ""
                });
                break;
              case "create_reminder":
                await storage.createDeadline({
                  title: action.data.title,
                  description: action.data.description || "",
                  dueDate: new Date(action.data.dueDate),
                  assignedTo: action.data.assignedTo || 1,
                  priority: action.data.priority || "medium"
                });
                break;
            }
          } catch (actionError) {
            console.error("Failed to execute action:", action.type, actionError);
          }
        }
      }
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to process voice command" });
    }
  });

  app.post("/api/ai/meal-suggestions", async (req, res) => {
    try {
      const { dietary, cookingTime, familySize, kidFriendly } = req.body;
      
      const suggestions = await generateMealSuggestions({
        dietary,
        cookingTime,
        familySize,
        kidFriendly
      });
      
      res.json({ suggestions });
    } catch (error) {
      console.error("Meal suggestions error:", error);
      res.status(500).json({ message: "Unable to generate meal suggestions" });
    }
  });

  app.post("/api/ai/smart-task-creation", async (req, res) => {
    try {
      const { voiceInput, familyMembers } = req.body;
      const members = familyMembers || await storage.getFamilyMembers();
      
      const result = await smartTaskCreation(voiceInput, members);
      
      // Return suggestions without auto-creating (frontend will handle creation)
      res.json(result);
    } catch (error) {
      console.error("Smart task creation error:", error);
      res.status(500).json({ message: "Unable to process voice input" });
    }
  });

  // Google Calendar Integration endpoints
  app.post("/api/calendar/connect", async (req, res) => {
    try {
      // In a real implementation, this would handle Google OAuth flow
      // For demo purposes, we'll simulate a successful connection
      const mockCalendars = [
        {
          id: "primary",
          name: "Primary Calendar",
          primary: true,
          backgroundColor: "#3174ad"
        },
        {
          id: "family-calendar",
          name: "Family Events",
          primary: false,
          backgroundColor: "#d96570"
        },
        {
          id: "work-calendar", 
          name: "Work Schedule",
          primary: false,
          backgroundColor: "#8b5a3c"
        }
      ];

      res.json({
        success: true,
        calendars: mockCalendars,
        message: "Successfully connected to Google Calendar"
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        message: "Failed to connect to Google Calendar: " + error.message 
      });
    }
  });

  app.post("/api/calendar/disconnect", async (req, res) => {
    try {
      // In real implementation, revoke OAuth tokens
      res.json({
        success: true,
        message: "Successfully disconnected from Google Calendar"
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        message: "Failed to disconnect: " + error.message 
      });
    }
  });

  app.post("/api/calendar/sync", async (req, res) => {
    try {
      const { calendarId, direction } = req.body;
      
      // In real implementation, this would:
      // 1. Fetch events from Google Calendar API
      // 2. Create/update events in our database
      // 3. Push our events to Google Calendar if bidirectional
      
      // Simulate sync process
      let eventCount = 0;
      if (direction === "import" || direction === "bidirectional") {
        eventCount += 15; // Mock imported events
      }
      if (direction === "export" || direction === "bidirectional") {
        eventCount += 8; // Mock exported events
      }

      res.json({
        success: true,
        eventCount,
        message: `Synchronized ${eventCount} events successfully`
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        message: "Sync failed: " + error.message 
      });
    }
  });

  // Notifications endpoints
  app.get("/api/notifications/pending", async (_req, res) => {
    try {
      const notifications = await storage.getPendingNotifications();
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Password management endpoints
  app.get("/api/passwords", async (_req, res) => {
    try {
      const passwords = await storage.getPasswords();
      res.json(passwords);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/passwords", async (req, res) => {
    try {
      const password = await storage.createPassword(req.body);
      res.status(201).json(password);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Grocery List endpoints
  app.get("/api/grocery-items", async (req, res) => {
    try {
      const items = await storage.getGroceryItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/grocery-items", async (req, res) => {
    try {
      const item = await storage.createGroceryItem(req.body);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/grocery-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.updateGroceryItem(id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Grocery item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Meal Plan endpoints
  app.get("/api/meal-plans", async (req, res) => {
    try {
      const plans = await storage.getMealPlans();
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/meal-plans", async (req, res) => {
    try {
      const plan = await storage.createMealPlan(req.body);
      res.status(201).json(plan);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/meal-plans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMealPlan(id);
      if (!success) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
