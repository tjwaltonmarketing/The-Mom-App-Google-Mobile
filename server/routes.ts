import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEventSchema,
  insertTaskSchema,
  insertVoiceNoteSchema,
  insertDeadlineSchema
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

  const httpServer = createServer(app);
  return httpServer;
}
