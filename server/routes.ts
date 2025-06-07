import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processAIRequest, generateMealSuggestions, smartTaskCreation } from "./ai";
import { 
  insertEventSchema,
  insertTaskSchema,
  insertVoiceNoteSchema,
  insertDeadlineSchema,
  insertNotificationSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
          members: familyMembers,
          upcomingEvents,
          pendingTasks
        }
      });
      
      res.json(response);
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ message: "AI assistant temporarily unavailable" });
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
      const { voiceInput } = req.body;
      const familyMembers = await storage.getFamilyMembers();
      
      const result = await smartTaskCreation(voiceInput, familyMembers);
      
      // Optionally auto-create the tasks
      if (result.tasks.length > 0) {
        const createdTasks = [];
        for (const taskData of result.tasks) {
          try {
            const task = await storage.createTask(taskData);
            createdTasks.push(task);
          } catch (error) {
            console.error("Failed to create task:", error);
          }
        }
        res.json({ ...result, createdTasks });
      } else {
        res.json(result);
      }
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

  const httpServer = createServer(app);
  return httpServer;
}
