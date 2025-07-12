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
// Set LeadConnector environment variables before importing SMS service
if (!process.env.LEADCONNECTOR_API_KEY) {
  process.env.LEADCONNECTOR_API_KEY = "215c65d0-72a8-4221-a0bc-cf39ebfc6acf";
  process.env.LEADCONNECTOR_LOCATION_ID = "Zuv4qgKlSoOyGdkVJtjr";
  console.log("🔧 LeadConnector credentials set in routes.ts");
}

import { smsService } from "./sms-providers";
import { emailService } from "./email-service";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup session middleware
  setupSession(app);

  // SMS service is initialized automatically with available providers

  // Health check endpoint for mobile connectivity testing
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      server: "replit",
      version: "3.0",
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // SMS providers status endpoint
  app.get("/api/sms/providers", (req, res) => {
    const providers = smsService.getAvailableProviders();
    const envDebug = {
      hasLeadConnectorKey: !!process.env.LEADCONNECTOR_API_KEY,
      hasLeadConnectorLocation: !!process.env.LEADCONNECTOR_LOCATION_ID,
      leadConnectorKeyStart: process.env.LEADCONNECTOR_API_KEY ? process.env.LEADCONNECTOR_API_KEY.substring(0, 15) + '...' : 'Not set',
      leadConnectorLocationId: process.env.LEADCONNECTOR_LOCATION_ID || 'Not set'
    };
    res.json({
      providers,
      count: providers.length,
      configured: providers.length > 0,
      debug: envDebug
    });
  });

  // Reinitialize SMS providers endpoint
  app.post("/api/sms/reinitialize", (req, res) => {
    smsService.reinitialize();
    const providers = smsService.getAvailableProviders();
    res.json({
      message: "SMS providers reinitialized",
      providers,
      count: providers.length,
      configured: providers.length > 0
    });
  });

  // SMS test endpoint
  app.post("/api/sms/test", async (req, res) => {
    try {
      const { phone, message } = req.body;
      
      if (!phone || !message) {
        return res.status(400).json({ 
          success: false, 
          error: "Phone number and message are required" 
        });
      }
      
      const result = await smsService.sendSMS(phone, message);
      
      if (result.success) {
        res.json({
          success: true,
          message: `SMS sent successfully via ${result.provider}`,
          messageId: result.messageId,
          provider: result.provider
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          availableProviders: smsService.getAvailableProviders()
        });
      }
    } catch (error: any) {
      console.error("SMS test error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to send test SMS: " + error.message 
      });
    }
  });

  // SMS debug endpoint
  app.get("/api/sms/debug", (req, res) => {
    const providers = smsService.getAvailableProviders();
    const envCheck = {
      hasLeadConnectorKey: !!process.env.LEADCONNECTOR_API_KEY,
      hasLeadConnectorLocation: !!process.env.LEADCONNECTOR_LOCATION_ID,
      hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasAwsKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasAwsSecret: !!process.env.AWS_SECRET_ACCESS_KEY,
      leadConnectorKeyPrefix: process.env.LEADCONNECTOR_API_KEY ? process.env.LEADCONNECTOR_API_KEY.substring(0, 10) + '...' : 'Not set',
      leadConnectorLocationId: process.env.LEADCONNECTOR_LOCATION_ID || 'Not set'
    };
    
    res.json({
      availableProviders: providers,
      providerCount: providers.length,
      environmentCheck: envCheck
    });
  });

  // Email service endpoints
  app.get("/api/email/status", (req, res) => {
    res.json({
      configured: emailService.isConfigured(),
      provider: emailService.getProvider(),
      hasApiKey: !!process.env.SENDGRID_API_KEY
    });
  });

  // Email test endpoint
  app.post("/api/email/test", async (req, res) => {
    try {
      const { to, subject, message } = req.body;
      
      if (!to || !subject || !message) {
        return res.status(400).json({ 
          success: false, 
          error: "To, subject, and message are required" 
        });
      }
      
      const html = `<h2>${subject}</h2><p>${message}</p>`;
      const result = await emailService.sendEmail(to, subject, html);
      
      if (result.success) {
        res.json({
          success: true,
          message: `Email sent successfully via ${result.provider}`,
          messageId: result.messageId,
          provider: result.provider
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          configured: emailService.isConfigured()
        });
      }
    } catch (error: any) {
      console.error("Email test error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to send test email: " + error.message 
      });
    }
  });

  // Teen invite with email option
  app.post("/api/teens/invite", requireAuth, async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { name, phone, email, preferredContact } = req.body;
      
      if (!name || (!phone && !email)) {
        return res.status(400).json({ 
          error: "Name and either phone or email is required" 
        });
      }

      // Generate invite token
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create teen member with generated avatar
      const avatar = name.charAt(0).toUpperCase(); // Generate avatar from first letter of name
      const teen = await storage.createFamilyMember({
        familyId: user.familyId,
        name,
        role: 'teen',
        color: '#10B981', // Default teen color
        avatar,
        phone: phone || null,
        email: email || null,
        inviteCode,
        inviteStatus: 'pending'
      });

      // Prepare invite message
      const inviteUrl = `${req.protocol}://${req.get('host')}/teen/join?code=${inviteCode}`;
      const message = `Hi ${name}! You've been invited to join your family's Mom App. Use code ${inviteCode} or visit: ${inviteUrl}`;
      
      let inviteResult = { success: false, method: '', error: 'No contact method available' };

      // Try preferred contact method first
      if (preferredContact === 'email' && email && emailService.isConfigured()) {
        const emailResult = await emailService.sendEmail(
          email,
          "You're invited to join The Mom App!",
          `
            <h2>You're invited to join your family's Mom App!</h2>
            <p>Hi ${name},</p>
            <p>Your family has invited you to join The Mom App to help coordinate schedules and stay connected.</p>
            <div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p><strong>Your invite code: ${inviteCode}</strong></p>
              <p><a href="${inviteUrl}" style="background: #0079f2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Now</a></p>
            </div>
            <p>Or visit: <a href="${inviteUrl}">${inviteUrl}</a></p>
            <p>Welcome to the family coordination hub!</p>
          `
        );
        if (emailResult.success) {
          inviteResult = { success: true, method: 'email', messageId: emailResult.messageId };
        } else {
          inviteResult = { success: false, method: 'email', error: emailResult.error };
        }
      } else if (preferredContact === 'sms' && phone) {
        const smsResult = await smsService.sendSMS(phone, message);
        if (smsResult.success) {
          inviteResult = { success: true, method: 'sms', messageId: smsResult.messageId };
        } else {
          inviteResult = { success: false, method: 'sms', error: smsResult.error };
        }
      }

      // If preferred method failed, try the other method as backup
      if (!inviteResult.success) {
        if (preferredContact === 'email' && phone) {
          const smsResult = await smsService.sendSMS(phone, message);
          if (smsResult.success) {
            inviteResult = { success: true, method: 'sms (backup)', messageId: smsResult.messageId };
          }
        } else if (preferredContact === 'sms' && email && emailService.isConfigured()) {
          const emailResult = await emailService.sendEmail(
            email,
            "You're invited to join The Mom App!",
            `
              <h2>You're invited to join your family's Mom App!</h2>
              <p>Hi ${name},</p>
              <p>Your family has invited you to join The Mom App to help coordinate schedules and stay connected.</p>
              <div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 8px; text-align: center;">
                <p><strong>Your invite code: ${inviteCode}</strong></p>
                <p><a href="${inviteUrl}" style="background: #0079f2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Now</a></p>
              </div>
              <p>Or visit: <a href="${inviteUrl}">${inviteUrl}</a></p>
              <p>Welcome to the family coordination hub!</p>
            `
          );
          if (emailResult.success) {
            inviteResult = { success: true, method: 'email (backup)', messageId: emailResult.messageId };
          }
        }
      }

      res.json({
        success: true,
        teen: {
          id: teen.id,
          name: teen.name,
          inviteCode,
          inviteStatus: 'pending'
        },
        invite: inviteResult
      });

    } catch (error: any) {
      console.error("Teen invite error:", error);
      res.status(500).json({ error: "Failed to create teen invite: " + error.message });
    }
  });

  // Validate invite code endpoint
  app.post("/api/family/invites/validate", async (req, res) => {
    try {
      const { inviteCode } = req.body;
      
      if (!inviteCode) {
        return res.status(400).json({ error: "Invite code is required" });
      }
      
      // In a real app, you would validate against the database
      // For demo purposes, accept any code that looks like a valid format
      const isValid = /^[A-Z0-9]{4,8}$/.test(inviteCode.toUpperCase());
      
      if (!isValid) {
        return res.status(400).json({ error: "Invalid invite code format" });
      }
      
      // Mock family data
      const familyData = {
        id: 1,
        name: "Walton",
        parentName: "Mom",
        memberCount: 3
      };
      
      res.json({
        success: true,
        valid: true,
        family: familyData,
        message: "Invite code is valid"
      });
      
    } catch (error: any) {
      console.error("Invite validation error:", error);
      res.status(500).json({ error: "Failed to validate invite code: " + error.message });
    }
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
      
      // Clear the auth token cookie
      res.clearCookie('auth_token', {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/'
      });
      
      // Also clear the session cookie
      res.clearCookie('connect.sid', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/'
      });
      
      console.log("Logout successful - cookies cleared");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Password Reset Routes
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }
      
      // Generate secure reset token
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Set token expiration to 1 hour from now
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      // Save reset token to database
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt,
        isUsed: false,
      });
      
      // In a real app, you would send an email here
      // For now, we'll return the token for testing purposes
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
      res.json({ 
        message: "If an account with that email exists, a password reset link has been sent.",
        // Remove this in production - only for testing
        resetToken: resetToken 
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
      
      // Find valid reset token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      // Hash new password
      const passwordHash = await hashPassword(newPassword);
      
      // Update user password
      const updatedUser = await storage.updateUserPassword(resetToken.userId, passwordHash);
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update password" });
      }
      
      // Mark token as used
      await storage.markPasswordResetTokenUsed(resetToken.id);
      
      res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
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

  app.delete("/api/events", async (req, res) => {
    try {
      await storage.deleteAllEvents();
      res.json({ message: "All events deleted successfully" });
    } catch (error) {
      console.error("Delete all events error:", error);
      res.status(500).json({ message: "Failed to delete all events" });
    }
  });

  // Fresh Start - Clear all data
  app.delete("/api/fresh-start", async (req, res) => {
    try {
      await storage.deleteAllTasks();
      await storage.deleteAllEvents();
      // Add other data clearing as needed
      res.json({ message: "All data cleared successfully - you have a fresh start!" });
    } catch (error) {
      console.error("Fresh start error:", error);
      res.status(500).json({ message: "Failed to clear all data" });
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

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      const success = await storage.deleteTask(taskId);
      
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.delete("/api/tasks", async (req, res) => {
    try {
      await storage.deleteAllTasks();
      res.json({ message: "All tasks deleted successfully" });
    } catch (error) {
      console.error("Delete all tasks error:", error);
      res.status(500).json({ message: "Failed to delete all tasks" });
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

  // Teen Account System Routes
  
  // Family invites - for parents to invite teens (remove requireAuth for testing)
  app.post("/api/family/invites", async (req, res) => {
    try {
      console.log("Creating teen invite with data:", req.body);
      
      // Mock invite creation for testing
      const inviteCode = `FAM-${Date.now().toString(36).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const invite = {
        id: Math.floor(Math.random() * 1000),
        inviteCode,
        familyId: 1,
        invitedBy: 1, // Mock user ID for testing
        invitedContact: req.body.contact,
        contactType: req.body.contactType,
        invitedRole: req.body.role,
        teenName: req.body.teenName,
        status: "pending",
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      };
      
      console.log("Teen invite created successfully:", invite);
      res.status(201).json(invite);
    } catch (error: any) {
      console.error("Failed to create teen invite:", error);
      res.status(500).json({ message: "Failed to create invite: " + error.message });
    }
  });

  app.post("/api/family/invites/:id/send", async (req, res) => {
    try {
      const inviteId = parseInt(req.params.id);
      const { contact, contactType, inviteCode, teenName } = req.body;
      
      console.log(`Sending invite ${inviteId} via ${contactType} to ${contact}`);
      
      if (contactType === "phone") {
        // Send SMS using available provider (Twilio or AWS SNS)
        const message = `Hi! You've been invited to join The Mom App family account.

👨‍👩‍👧‍👦 Teen Account Setup
Your invite code: ${inviteCode}

📱 Get the app:
• Download "The Mom App" from your app store
• Enter your invite code: ${inviteCode}
• Complete your profile setup

✨ What you get:
• Track your chores and earn points
• Build daily streaks for completing tasks
• Get smart reminders (no more nagging!)
• See family calendar events

Download now and join the family! 🎉

- The Mom App Team
themomapp.us@gmail.com`;

        const smsResult = await smsService.sendSMS(contact, message);
        
        if (smsResult.success) {
          console.log(`SMS sent successfully via ${smsResult.provider}: ${smsResult.messageId}`);
          
          res.json({ 
            success: true, 
            message: `Invitation sent via SMS successfully using ${smsResult.provider}`,
            messageId: smsResult.messageId,
            provider: smsResult.provider
          });
        } else {
          console.error("SMS sending failed:", smsResult.error);
          
          // Provide helpful error messages
          let errorMessage = smsResult.error || "Failed to send SMS";
          if (errorMessage.includes("Invalid phone number")) {
            errorMessage = "Invalid phone number format. Please use format: +1234567890";
          } else if (errorMessage.includes("not verified")) {
            errorMessage = "Phone number not verified. Please verify the number first.";
          } else if (errorMessage.includes("authentication") || errorMessage.includes("credentials")) {
            errorMessage = "SMS service authentication failed. Please check your credentials.";
          }
          
          res.status(400).json({ 
            success: false, 
            message: errorMessage,
            error: smsResult.error 
          });
        }
      } else if (contactType === "email") {
        // For email, we'll return success but note it needs email service
        console.log(`Email invite would be sent to: ${contact}`);
        res.json({ 
          success: true, 
          message: "Invitation prepared (Email service integration needed)",
          note: "SMS is recommended for teen invites"
        });
      } else {
        const availableProviders = smsService.getAvailableProviders();
        res.status(400).json({ 
          success: false, 
          message: availableProviders.length > 0 
            ? "SMS service available but phone contact method not selected" 
            : "No SMS providers configured. Please set up Twilio or AWS SNS credentials.",
          availableProviders
        });
      }
    } catch (error: any) {
      console.error("Send invite error:", error);
      res.status(500).json({ message: "Failed to send invite: " + error.message });
    }
  });

  app.post("/api/family/invites/validate", async (req, res) => {
    try {
      const { inviteCode } = req.body;
      
      // Mock validation - in real implementation would check database
      if (inviteCode && inviteCode.startsWith("FAM-")) {
        res.json({
          valid: true,
          family: {
            id: 1,
            name: "The Smith Family",
            parentName: "Sarah Smith"
          }
        });
      } else {
        res.status(400).json({ valid: false, message: "Invalid invite code" });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to validate invite: " + error.message });
    }
  });

  // Teen onboarding completion
  app.post("/api/teen/complete-onboarding", async (req, res) => {
    try {
      const { inviteCode, profile, notificationSettings } = req.body;
      
      // Mock teen account creation
      const teenAccount = {
        id: Math.floor(Math.random() * 1000),
        userId: Math.floor(Math.random() * 1000),
        familyMemberId: Math.floor(Math.random() * 1000),
        ...profile,
        points: 0,
        streak: 0,
        createdAt: new Date().toISOString(),
      };
      
      // Mock notification settings
      const settings = {
        id: Math.floor(Math.random() * 1000),
        teenProfileId: teenAccount.id,
        ...notificationSettings,
        updatedAt: new Date().toISOString(),
      };
      
      console.log("Teen onboarding completed:", { teenAccount, settings });
      
      res.json({ 
        success: true, 
        teenProfile: teenAccount,
        notificationSettings: settings 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to complete onboarding: " + error.message });
    }
  });

  // Teen setup completion (full profile creation)
  app.post("/api/teen/complete-setup", async (req, res) => {
    try {
      const { profile, notificationSettings } = req.body;
      
      // Hash password for security
      const passwordHash = await hashPassword(profile.password);
      
      // Create teen account with full credentials
      const teenAccount = {
        id: Math.floor(Math.random() * 1000),
        userId: Math.floor(Math.random() * 1000),
        familyMemberId: Math.floor(Math.random() * 1000),
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        passwordHash, // Store hashed password
        age: profile.age,
        favoriteColor: profile.favoriteColor,
        points: 0,
        streak: 0,
        createdAt: new Date().toISOString(),
      };
      
      // Set session for teen login
      req.session!.teenId = teenAccount.id;
      
      console.log("Teen setup completed:", { 
        username: teenAccount.username, 
        id: teenAccount.id 
      });
      
      res.json({ 
        success: true, 
        teenProfile: teenAccount,
        notificationSettings 
      });
    } catch (error: any) {
      console.error("Teen setup error:", error);
      res.status(500).json({ message: "Failed to complete setup: " + error.message });
    }
  });

  // Teen login with invite code
  app.post("/api/teen/login-with-invite", async (req, res) => {
    try {
      const { inviteCode } = req.body;
      
      if (!inviteCode) {
        return res.status(400).json({ error: "Invite code is required" });
      }
      
      // Validate invite code format
      const isValid = /^[A-Z0-9]{4,8}$/.test(inviteCode.toUpperCase());
      
      if (!isValid) {
        return res.status(400).json({ error: "Invalid invite code format" });
      }
      
      // Check if teen already has an account for this invite
      // For demo purposes, assume teens with codes starting with specific letters need setup
      const needsSetup = inviteCode.startsWith('NEW') || inviteCode.startsWith('SET');
      
      if (needsSetup) {
        res.json({
          needsSetup: true,
          inviteCode,
          family: {
            id: 1,
            name: "Walton",
            parentName: "Mom"
          }
        });
      } else {
        // Mock existing teen profile
        const teenProfile = {
          id: 123,
          firstName: "Adri",
          lastName: "Walton",
          username: "adri_w",
          points: 285,
          streak: 12,
          favoriteColor: "purple"
        };
        
        // Set session
        req.session!.teenId = teenProfile.id;
        
        res.json({
          needsSetup: false,
          teenProfile,
          family: {
            id: 1,
            name: "Walton",
            parentName: "Mom"
          }
        });
      }
    } catch (error: any) {
      console.error("Teen invite login error:", error);
      res.status(500).json({ error: "Failed to login with invite code: " + error.message });
    }
  });

  // Teen login with username/password
  app.post("/api/teen/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      // Mock teen authentication - in real app, check against database
      const mockTeens = [
        { id: 123, username: "adri_w", password: "password123", firstName: "Adri" },
        { id: 124, username: "teen_demo", password: "demo123", firstName: "Demo" }
      ];
      
      const teen = mockTeens.find(t => t.username === username);
      
      if (!teen) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // In real app, use bcrypt to compare hashed passwords
      const isValidPassword = teen.password === password;
      
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Set session
      req.session!.teenId = teen.id;
      
      res.json({
        success: true,
        teenProfile: {
          id: teen.id,
          firstName: teen.firstName,
          username: teen.username
        }
      });
    } catch (error: any) {
      console.error("Teen login error:", error);
      res.status(500).json({ error: "Failed to login: " + error.message });
    }
  });

  // Teen auth check
  app.get("/api/teen/auth/user", async (req, res) => {
    try {
      const teenId = req.session?.teenId;
      
      if (!teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Mock teen profile - in real app, fetch from database
      const teenProfile = {
        id: teenId,
        firstName: "Adri",
        lastName: "Walton",
        username: "adri_w",
        points: 285,
        streak: 12,
        favoriteColor: "purple",
        avatar: null, // No custom avatar initially
        family: {
          id: 1,
          name: "Walton"
        }
      };
      
      res.json(teenProfile);
    } catch (error: any) {
      console.error("Teen auth check error:", error);
      res.status(500).json({ error: "Failed to get teen user" });
    }
  });

  // Teen logout
  app.post("/api/teen/logout", async (req, res) => {
    try {
      req.session!.teenId = undefined;
      res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      console.error("Teen logout error:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  // Teen profile update
  app.put("/api/teen/profile", async (req, res) => {
    try {
      const teenId = req.session?.teenId;
      
      if (!teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const updates = req.body;
      
      // In a real app, you would:
      // 1. Validate the updates
      // 2. Update the database
      // 3. If avatar is provided, save to file storage (AWS S3, Cloudinary, etc.)
      
      console.log("Updating teen profile:", { teenId, updates });
      
      // Mock successful update - in reality, fetch updated profile from DB
      const updatedProfile = {
        id: teenId,
        firstName: "Adri",
        lastName: "Walton",
        username: "adri_w",
        points: 285,
        streak: 12,
        favoriteColor: updates.favoriteColor || "purple",
        avatar: updates.avatar || null, // Store base64 or file URL
        family: {
          id: 1,
          name: "Walton"
        }
      };
      
      res.json({ success: true, profile: updatedProfile });
    } catch (error: any) {
      console.error("Teen profile update error:", error);
      res.status(500).json({ error: "Failed to update profile: " + error.message });
    }
  });

  // Teen notifications
  app.get("/api/teen/notifications", async (req, res) => {
    try {
      const teenId = req.session?.teenId;
      
      if (!teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Mock notifications - in real app, fetch from database
      const notifications = [
        // Currently empty for demo - will show "No notifications yet" message
      ];
      
      res.json(notifications);
    } catch (error: any) {
      console.error("Teen notifications error:", error);
      res.status(500).json({ error: "Failed to get notifications: " + error.message });
    }
  });

  // Teen shared passwords
  app.get("/api/teen/shared-passwords", async (req, res) => {
    try {
      const teenId = req.session?.teenId;
      
      if (!teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Mock shared passwords - in real app, fetch from database based on teen's family
      const sharedPasswords = [
        {
          id: 1,
          service: "Disney Plus",
          category: "streaming",
          username: "family@walton.com",
          password: "DisneyFun2024!",
          notes: "This is our family Disney Plus account. Please don't change anything in the profile settings.",
          sharedBy: "Mom",
          sharedAt: new Date("2024-01-15T10:30:00Z"),
          lastUsed: new Date("2024-01-20T19:45:00Z")
        },
        {
          id: 2,
          service: "Netflix",
          category: "streaming", 
          username: "walton.family@gmail.com",
          password: "Netflix123$",
          notes: "Use the 'Kids' profile for age-appropriate content.",
          sharedBy: "Dad",
          sharedAt: new Date("2024-01-10T14:20:00Z"),
          lastUsed: new Date("2024-01-19T20:15:00Z")
        },
        {
          id: 3,
          service: "Khan Academy",
          category: "educational",
          username: "adri.walton@student.edu",
          password: "LearnEveryday2024",
          notes: "Great for math and science practice. Your progress syncs with your school account.",
          sharedBy: "Mom",
          sharedAt: new Date("2024-01-05T09:00:00Z")
        }
      ];
      
      res.json(sharedPasswords);
    } catch (error: any) {
      console.error("Teen shared passwords error:", error);
      res.status(500).json({ error: "Failed to get shared passwords: " + error.message });
    }
  });

  // Teen dashboard data
  app.get("/api/teen/tasks", async (req, res) => {
    try {
      // Mock teen tasks
      const teenTasks = [
        {
          id: 1,
          title: "Clean your room",
          description: "Make bed, organize desk, vacuum floor",
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "high",
          assignedBy: "Mom",
          points: 25,
          isCompleted: false,
          reminderCount: 1,
        },
        {
          id: 2,
          title: "Take out trash",
          description: "Garbage and recycling to curb",
          dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          priority: "medium",
          assignedBy: "Dad",
          points: 15,
          isCompleted: false,
          reminderCount: 0,
        },
        {
          id: 3,
          title: "Walk the dog",
          description: "30 minute walk around the neighborhood",
          dueDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Overdue
          priority: "high",
          assignedBy: "Mom",
          points: 20,
          isCompleted: false,
          reminderCount: 3,
        },
      ];
      
      res.json(teenTasks);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch teen tasks: " + error.message });
    }
  });

  app.get("/api/teen/events/today", async (req, res) => {
    try {
      // Mock today's events for teen
      const todayEvents = [
        {
          id: 1,
          title: "Soccer Practice",
          startTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 4.5 * 60 * 60 * 1000).toISOString(),
          type: "personal",
        },
        {
          id: 2,
          title: "Family Dinner",
          startTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
          type: "family",
        },
      ];
      
      res.json(todayEvents);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch today's events: " + error.message });
    }
  });

  app.get("/api/teen/stats", async (req, res) => {
    try {
      // Mock teen stats
      const stats = {
        weeklyPoints: 85,
        streak: 3,
        completedToday: 1,
      };
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch teen stats: " + error.message });
    }
  });

  app.post("/api/teen/tasks/:id/complete", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      // Mock task completion
      const pointsEarned = 25;
      
      res.json({
        success: true,
        pointsEarned,
        message: `Task completed! You earned ${pointsEarned} points!`,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to complete task: " + error.message });
    }
  });

  app.post("/api/teen/tasks/:id/snooze", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { hours } = req.body;
      
      // Mock task snoozing
      res.json({
        success: true,
        message: `Task snoozed for ${hours} hours`,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to snooze task: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
