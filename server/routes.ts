import { Express } from "express";
import { createServer } from "http";
import { DatabaseStorage } from "./storage";
import { smartTaskCreation } from "./ai";
import { WeatherService } from "./weather-service";
import { sendSMS } from "./sms-service";
import { setupAuth, isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";

const storage = new DatabaseStorage();

export async function registerRoutes(app: Express) {
  // Setup Replit Auth first (handles sessions, passport, login/logout routes)
  await setupAuth(app);
  
  // Create HTTP server
  const server = createServer(app);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Placeholder for API routes
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working" });
  });

  // Weather API endpoint
  app.get("/api/weather/:location", async (req, res) => {
    try {
      const location = decodeURIComponent(req.params.location);
      const unit = req.query.unit as 'celsius' | 'fahrenheit' || 'fahrenheit';
      
      if (!location || location.trim() === '') {
        return res.status(400).json({ error: "Location parameter is required" });
      }

      const weather = await WeatherService.getWeatherForLocation(location, unit);
      
      if (!weather) {
        return res.status(404).json({ error: "Weather data not available for this location" });
      }

      res.json(weather);
    } catch (error) {
      console.error("Weather API error:", error);
      res.status(500).json({ error: "Failed to fetch weather data" });
    }
  });

  // Parent Authentication Endpoints
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Set parent session ONLY and clear teen session
      req.session.userId = user.id;
      delete req.session.teenId; // Clear teen session
      
      // Save session synchronously
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("Parent login session saved successfully for user:", user.id);
            resolve();
          }
        });
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isVerified: user.isVerified
        }
      });
    } catch (error) {
      console.error("Parent login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      // Check traditional session-based authentication first
      if (req.session.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          return res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            authMethod: user.authMethod,
            isVerified: user.isVerified
          });
        }
      }
      
      // Check Replit Auth authentication
      if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        const userClaims = (req.user as any).claims;
        if (userClaims && userClaims.sub) {
          // Find user by Replit ID
          const user = await storage.getUserByReplitId(userClaims.sub);
          if (user) {
            return res.json({
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl,
              authMethod: user.authMethod,
              isVerified: user.isVerified
            });
          }
        }
      }
      
      // Not authenticated
      res.status(401).json({ error: "Not authenticated" });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Failed to check authentication" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Teen Authentication Endpoints
  app.get("/api/teen/auth/user", async (req, res) => {
    try {
      // Check if teen is authenticated via session
      if (req.session.teenId) {
        const teenProfile = await storage.getTeenProfile(req.session.teenId);
        if (teenProfile) {
          return res.json({
            isAuthenticated: true,
            teenId: teenProfile.id,
            teenProfile: {
              id: teenProfile.id,
              firstName: teenProfile.firstName,
              lastName: teenProfile.lastName,
              username: teenProfile.username,
              avatar: teenProfile.avatar,
              points: teenProfile.points,
              streak: teenProfile.streak,
              favoriteColor: teenProfile.favoriteColor,
              familyMemberId: teenProfile.familyMemberId
            }
          });
        }
      }
      
      // Not authenticated
      res.json({
        isAuthenticated: false,
        teenId: null,
        teenProfile: null
      });
    } catch (error) {
      console.error("Teen auth check error:", error);
      res.status(500).json({ error: "Failed to check authentication" });
    }
  });

  app.post("/api/teen/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Find teen profile by username
      const teenProfile = await storage.getTeenProfileByUsername(username);
      if (!teenProfile) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Get the associated user account
      const user = await storage.getUserById(teenProfile.userId);
      if (!user) {
        return res.status(401).json({ error: "User account not found" });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set teen session ONLY and clear any parent session
      req.session.teenId = teenProfile.id;
      delete req.session.userId; // Clear parent session
      
      // Save session synchronously before responding
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("Session saved successfully with teenId:", teenProfile.id);
            resolve();
          }
        });
      });

      res.json({
        success: true,
        teenProfile: {
          id: teenProfile.id,
          firstName: teenProfile.firstName,
          lastName: teenProfile.lastName,
          username: teenProfile.username,
          avatar: teenProfile.avatar,
          points: teenProfile.points,
          streak: teenProfile.streak,
          favoriteColor: teenProfile.favoriteColor,
          familyMemberId: teenProfile.familyMemberId
        }
      });
    } catch (error) {
      console.error("Teen login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/teen/login-with-invite", async (req, res) => {
    try {
      const { inviteCode } = req.body;
      
      if (!inviteCode) {
        return res.status(400).json({ error: "Invite code is required" });
      }

      // Find and validate invite
      const invite = await storage.getFamilyInvite(inviteCode);
      if (!invite || invite.status !== 'pending') {
        return res.status(401).json({ error: "Invalid or expired invite code" });
      }

      // Check if invite has expired
      if (new Date() > invite.expiresAt) {
        return res.status(401).json({ error: "Invite code has expired" });
      }

      // Check if teen already has an account
      const existingTeen = await storage.getTeenProfileByUserId(invite.acceptedBy || 0);
      
      if (existingTeen) {
        // Teen already set up, just log them in
        req.session.teenId = existingTeen.id;
        delete req.session.userId; // Clear parent session
        
        return res.json({
          success: true,
          needsSetup: false,
          teenProfile: {
            id: existingTeen.id,
            firstName: existingTeen.firstName,
            lastName: existingTeen.lastName,
            username: existingTeen.username,
            avatar: existingTeen.avatar,
            points: existingTeen.points,
            streak: existingTeen.streak,
            favoriteColor: existingTeen.favoriteColor,
            familyMemberId: existingTeen.familyMemberId
          }
        });
      }

      // New teen needs setup
      req.session.inviteCode = inviteCode;
      
      res.json({
        success: true,
        needsSetup: true,
        inviteData: {
          teenName: invite.teenName,
          familyId: invite.familyId
        }
      });
    } catch (error) {
      console.error("Teen invite login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/teen/complete-setup", async (req, res) => {
    try {
      const { profile, notificationSettings } = req.body;
      const inviteCode = req.session.inviteCode;
      
      if (!inviteCode) {
        return res.status(400).json({ error: "No valid invite session" });
      }

      // Get invite details
      const invite = await storage.getFamilyInvite(inviteCode);
      if (!invite) {
        return res.status(400).json({ error: "Invalid invite" });
      }

      // Create user account
      const passwordHash = await bcrypt.hash(profile.password, 10);
      const user = await storage.createUser({
        email: `${profile.username}@teen.local`, // Temporary email for teen accounts
        passwordHash,
        firstName: profile.firstName,
        lastName: profile.lastName
      });

      // Create family member record
      const familyMember = await storage.createFamilyMember({
        name: `${profile.firstName} ${profile.lastName}`,
        role: "teen",
        color: profile.favoriteColor || "#8B5CF6",
        avatar: profile.firstName.charAt(0).toUpperCase(),
        userId: user.id,
        familyId: invite.familyId,
        canLogin: true,
        isActive: true
      });

      // Create teen profile
      const teenProfile = await storage.createTeenProfile({
        userId: user.id,
        familyMemberId: familyMember.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        age: parseInt(profile.age) || null,
        favoriteColor: profile.favoriteColor || "#8B5CF6"
      });

      // Create notification settings
      await storage.createTeenNotificationSettings({
        teenProfileId: teenProfile.id,
        ...notificationSettings
      });

      // Accept the invite
      await storage.acceptFamilyInvite(inviteCode, user.id);

      // Set teen session ONLY and clear parent session
      req.session.teenId = teenProfile.id;
      delete req.session.userId; // Clear parent session
      delete req.session.inviteCode;

      res.json({
        success: true,
        teenProfile: {
          id: teenProfile.id,
          firstName: teenProfile.firstName,
          lastName: teenProfile.lastName,
          username: teenProfile.username,
          avatar: teenProfile.avatar,
          points: teenProfile.points,
          streak: teenProfile.streak,
          favoriteColor: teenProfile.favoriteColor
        }
      });
    } catch (error) {
      console.error("Teen setup error:", error);
      res.status(500).json({ error: "Setup failed" });
    }
  });

  app.post("/api/teen/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Teen logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.put("/api/teen/profile", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { avatar, favoriteColor } = req.body;
      
      // Update teen profile
      const updatedProfile = await storage.updateTeenProfile(req.session.teenId, {
        avatar,
        favoriteColor
      });

      res.json({
        success: true,
        teenProfile: updatedProfile
      });
    } catch (error) {
      console.error("Teen profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Teen tasks endpoint
  app.get("/api/teen/tasks", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get tasks assigned to this teen
      const tasks = await storage.getTasksForTeen(req.session.teenId);
      
      res.json(tasks);
    } catch (error) {
      console.error("Teen tasks fetch error:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Teen task creation endpoint
  app.post("/api/teen/tasks", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { title, description, dueDate, priority, category, estimatedTime } = req.body;

      // Get the teen's profile and family info
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Create the task
      const taskData = {
        title,
        description: description || "",
        dueDate: new Date(dueDate),
        priority: priority || "medium",
        assignedTo: familyMember.id,
        teenId: teenProfile.id,
        points: priority === "high" ? 15 : priority === "medium" ? 10 : 5,
        category: category || "personal",
        estimatedTime: estimatedTime ? parseInt(estimatedTime) : 30,
        createdBy: familyMember.id, // Use family member ID instead of user ID
        isCompleted: false
      };

      const newTask = await storage.createTask(taskData);

      res.json(newTask);
    } catch (error) {
      console.error("Teen task creation error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Teen task update endpoint (for completion toggle)
  app.put("/api/teen/tasks/:taskId", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const taskId = parseInt(req.params.taskId);
      const { completed } = req.body;

      // Get the teen's profile and family member info to use the correct family member ID
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const updatedTask = await storage.updateTask(taskId, { 
        isCompleted: completed,
        completedAt: completed ? new Date() : null,
        completedBy: completed ? teenProfile.familyMemberId : null // Use family member ID, not teen ID
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Teen task update error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Teen task delete endpoint (only for tasks they created)
  app.delete("/api/teen/tasks/:taskId", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const taskId = parseInt(req.params.taskId);

      // Get the teen's profile and family member info
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      // Get the task to check if the teen created it
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Only allow deletion if the teen created the task (createdBy matches their family member ID)
      if (task.createdBy !== teenProfile.familyMemberId) {
        return res.status(403).json({ error: "You can only delete tasks you created" });
      }

      // Delete the task
      await storage.deleteTask(taskId);

      res.json({ success: true });
    } catch (error) {
      console.error("Teen task delete error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Teen events endpoint  
  app.get("/api/teen/events", async (req, res) => {
    try {
      console.log("Teen events API called, session teenId:", req.session.teenId);
      
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record to find familyId
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      console.log("Teen profile:", teenProfile ? `Found ID ${teenProfile.id}` : "Not found");
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      console.log("Family member:", familyMember ? `Found ID ${familyMember.id}, familyId ${familyMember.familyId}` : "Not found");
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get events for the family
      const events = await storage.getEventsByFamily(familyMember.familyId);
      console.log(`Raw events from DB: ${events.length} events for family ${familyMember.familyId}`);
      
      // Show all family events to teens (they should see family schedule)
      // Only filter out truly private events if needed
      const relevantEvents = events.filter((event: any) => 
        event.visibilityType !== 'private' // Show shared and busy events
      );
      
      console.log(`Filtered events: ${relevantEvents.length} non-private events`);
      res.json(relevantEvents);
    } catch (error) {
      console.error("Teen events fetch error:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Teen create event endpoint
  app.post("/api/teen/events", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      const { title, date, time, endTime, location, description, type } = req.body;

      if (!title || !date || !time) {
        return res.status(400).json({ error: "Title, date, and time are required" });
      }

      // Parse the date and time for MST timezone correctly
      // In summer (DST), Mountain Time is UTC-6, in winter it's UTC-7
      // August is DST, so we add 6 hours to convert MDT input to UTC
      const mstDateTime = new Date(`${date}T${time}`);
      const startDateTime = new Date(mstDateTime.getTime() + (6 * 60 * 60 * 1000)); // Add 6 hours for MDT->UTC
      const mstEndDateTime = endTime ? new Date(`${date}T${endTime}`) : new Date(mstDateTime.getTime() + 60 * 60 * 1000);
      const endDateTime = endTime ? new Date(mstEndDateTime.getTime() + (6 * 60 * 60 * 1000)) : new Date(startDateTime.getTime() + 60 * 60 * 1000);

      // Create the event
      const eventData = {
        title,
        description: description || "",
        startTime: startDateTime,
        endTime: endDateTime,
        location: location || "",
        familyId: familyMember.familyId,
        assignedTo: [teenProfile.familyMemberId], // Assign to the teen (as array)
        isAllDay: false,
        isPrivate: false,
        visibilityType: "shared", // Teen events are shared by default
        sharedWith: [],
        createdBy: teenProfile.familyMemberId
      };

      const newEvent = await storage.createEvent(eventData);
      
      res.json(newEvent);
    } catch (error) {
      console.error("Teen event creation error:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Teen delete event endpoint - allows teens to delete their own events
  app.delete("/api/teen/events/:eventId", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const eventId = parseInt(req.params.eventId);
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      // Get the event to check ownership
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Only allow deletion if the teen created the event
      if (event.createdBy !== teenProfile.familyMemberId) {
        return res.status(403).json({ error: "You can only delete events you created" });
      }

      // Delete the event
      await storage.deleteEvent(eventId);
      res.json({ success: true });
    } catch (error) {
      console.error("Teen event delete error:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // Teen passwords endpoints - Get teen's own passwords
  app.get("/api/teen/passwords", async (req, res) => {
    try {
      console.log("Teen passwords request - session:", req.session);
      console.log("Teen passwords request - teenId:", req.session.teenId);
      
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get passwords created by this teen (using their family member ID)
      console.log("Looking for passwords created by familyMemberId:", teenProfile.familyMemberId);
      const passwords = await storage.getPasswordsByCreator(teenProfile.familyMemberId);
      console.log("Found passwords for teen:", passwords);
      
      res.json(passwords);
    } catch (error) {
      console.error("Teen passwords fetch error:", error);
      res.status(500).json({ error: "Failed to fetch passwords" });
    }
  });

  // Teen shared passwords endpoint - Get passwords shared with this teen
  app.get("/api/teen/shared-passwords", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get all passwords and filter for ones shared with this teen
      const allPasswords = await storage.getPasswordsByFamily(familyMember.familyId);
      const sharedPasswords = allPasswords.filter(password => {
        if (!password.sharedWith) return false;
        
        try {
          const sharedWithArray = JSON.parse(password.sharedWith);
          return Array.isArray(sharedWithArray) && sharedWithArray.includes(teenProfile.familyMemberId);
        } catch (error) {
          console.error("Error parsing sharedWith:", password.sharedWith, error);
          return false;
        }
      });

      // Transform to match the teen page interface
      const transformedPasswords = sharedPasswords.map(password => {
        // Get who shared it (creator name)
        const createdByName = familyMember.familyId === familyMember.familyId ? "Family" : "Parent";
        
        return {
          id: password.id,
          service: password.title,
          category: password.category,
          username: password.username || password.email || "",
          password: password.password,
          notes: password.notes,
          sharedBy: createdByName,
          sharedAt: password.createdAt,
          lastUsed: password.lastUpdated
        };
      });
      
      res.json(transformedPasswords);
    } catch (error) {
      console.error("Teen shared passwords fetch error:", error);
      res.status(500).json({ error: "Failed to fetch shared passwords" });
    }
  });

  // Teen create password endpoint
  app.post("/api/teen/passwords", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      const { title, category, website, username, email, password, notes } = req.body;

      if (!title || !password) {
        return res.status(400).json({ error: "Title and password are required" });
      }

      // Create the password entry
      const passwordData = {
        title,
        category: category || "other",
        website: website || "",
        username: username || "",
        email: email || "",
        password, // In a real app, this should be encrypted
        notes: notes || "",
        createdBy: familyMember.id,
        sharedWith: "[]", // Teen passwords are private by default
        isFavorite: false
      };

      const newPassword = await storage.createPassword(passwordData);
      
      res.json(newPassword);
    } catch (error) {
      console.error("Teen password creation error:", error);
      res.status(500).json({ error: "Failed to create password" });
    }
  });

  // Teen update password endpoint
  app.put("/api/teen/passwords/:id", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const passwordId = parseInt(req.params.id);
      const { title, category, website, username, email, password, notes } = req.body;

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Verify the password belongs to this teen
      const existingPassword = await storage.getPasswordById(passwordId);
      if (!existingPassword || existingPassword.createdBy !== familyMember.id) {
        return res.status(403).json({ error: "You can only edit passwords you created" });
      }

      const updateData = {
        title,
        category: category || "other",
        website: website || "",
        username: username || "",
        email: email || "",
        password, // Should be encrypted in real app
        notes: notes || ""
      };

      const updatedPassword = await storage.updatePassword(passwordId, updateData);
      res.json(updatedPassword);
    } catch (error) {
      console.error("Teen password update error:", error);
      res.status(500).json({ error: "Failed to update password" });
    }
  });

  // Teen delete password endpoint
  app.delete("/api/teen/passwords/:id", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const passwordId = parseInt(req.params.id);

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Verify the password belongs to this teen
      const existingPassword = await storage.getPasswordById(passwordId);
      if (!existingPassword || existingPassword.createdBy !== familyMember.id) {
        return res.status(403).json({ error: "You can only delete passwords you created" });
      }

      await storage.deletePassword(passwordId);
      res.json({ success: true });
    } catch (error) {
      console.error("Teen password delete error:", error);
      res.status(500).json({ error: "Failed to delete password" });
    }
  });

  // Test endpoint to delete existing teen data
  app.delete("/api/teen/delete-test-data", async (req, res) => {
    try {
      const existingTeen = await storage.getTeenProfileByUsername("AdriWalton1");
      if (existingTeen) {
        // Delete teen profile and related data
        await storage.deleteTeenProfile(existingTeen.id);
        await storage.deleteUserById(existingTeen.userId);
      }
      res.json({ message: "Test teen data deleted" });
    } catch (error) {
      console.error("Delete test teen error:", error);
      res.status(500).json({ error: "Failed to delete test teen" });
    }
  });

  // Test endpoint to create sample teen data - DISABLED to prevent dummy data
  // app.post("/api/setup-test-teen", async (req, res) => {
  //   res.status(404).json({ error: "Test data endpoint disabled" });
  // });

  // Teen Household Settings - Shared family status like dishwasher
  app.get("/api/teen/household-settings", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      const settings = await storage.getHouseholdSettings(familyMember.familyId);
      res.json(settings);
    } catch (error) {
      console.error("Teen household settings error:", error);
      res.status(500).json({ error: "Failed to get household settings" });
    }
  });

  // Teen Meal Plans - Shared family meal planning (read-only for teens)
  app.get("/api/teen/meal-plans", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get meal plans for the teen's family only
      const mealPlans = await storage.getMealPlansByFamily(familyMember.familyId);
      res.json(mealPlans);
    } catch (error) {
      console.error("Teen meal plans error:", error);
      res.status(500).json({ error: "Failed to get meal plans" });
    }
  });

  // Teen Weekly Meal Plans - Specific endpoint for dashboard
  app.get("/api/teen/meal-plans/week", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get meal plans for the teen's family only
      const mealPlans = await storage.getMealPlansByFamily(familyMember.familyId);
      res.json(mealPlans);
    } catch (error) {
      console.error("Teen weekly meal plans error:", error);
      res.status(500).json({ error: "Failed to get weekly meal plans" });
    }
  });

  app.put("/api/teen/household-settings/dishwasher", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      const { isClean } = req.body;
      const updatedSettings = await storage.updateDishwasherStatus(
        familyMember.familyId, 
        isClean, 
        familyMember.id
      );
      
      res.json({ 
        ...updatedSettings,
        message: `Dishwasher marked as ${isClean ? 'clean' : 'dirty'}` 
      });
    } catch (error) {
      console.error("Teen dishwasher update error:", error);
      res.status(500).json({ error: "Failed to update dishwasher status" });
    }
  });

  // Teen grocery items endpoints
  app.get("/api/teen/grocery-items", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get grocery items for the teen's family only
      const groceryItems = await storage.getGroceryItemsByFamily(familyMember.familyId);
      res.json(groceryItems);
    } catch (error) {
      console.error("Teen grocery items error:", error);
      res.status(500).json({ error: "Failed to get grocery items" });
    }
  });

  // Teen family members endpoints
  app.get("/api/teen/family-members", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get family members for the teen's family only
      const familyMembers = await storage.getFamilyMembersByFamily(familyMember.familyId);
      res.json(familyMembers);
    } catch (error) {
      console.error("Teen family members error:", error);
      res.status(500).json({ error: "Failed to get family members" });
    }
  });

  // Parent Household Settings Endpoints
  app.get("/api/household-settings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the user's family membership
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      let settings = await storage.getHouseholdSettings(familyMembership.familyId);
      
      // If no settings exist, create default ones
      if (!settings) {
        const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
        if (!familyMember) {
          return res.status(404).json({ error: "Family member not found" });
        }
        
        settings = await storage.updateDishwasherStatus(
          familyMembership.familyId, 
          false, 
          familyMember.id
        );
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Household settings error:", error);
      res.status(500).json({ error: "Failed to get household settings" });
    }
  });

  app.put("/api/household-settings/dishwasher", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the user's family membership
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get the family member record for the updatedBy field
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      const { isClean } = req.body;
      const updatedSettings = await storage.updateDishwasherStatus(
        familyMembership.familyId, 
        isClean, 
        familyMember.id
      );
      
      res.json({ 
        ...updatedSettings,
        message: `Dishwasher marked as ${isClean ? 'clean' : 'dirty'}` 
      });
    } catch (error) {
      console.error("Parent dishwasher update error:", error);
      res.status(500).json({ error: "Failed to update dishwasher status" });
    }
  });

  // Parent Dashboard and Task Management Endpoints
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the user's family membership
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get pending tasks for the family
      const pendingTasks = await storage.getPendingTasksByFamily(familyMembership.familyId);
      
      // Get events for today
      const todayEvents = await storage.getTodayEventsByFamily(familyMembership.familyId);

      res.json({
        pendingTasks: pendingTasks.length,
        todayEvents: todayEvents.length,
        familyMembers: await storage.getFamilyMembersByFamily(familyMembership.familyId)
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/tasks/pending", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const pendingTasks = await storage.getPendingTasksByFamily(familyMembership.familyId);
      res.json(pendingTasks);
    } catch (error) {
      console.error("Pending tasks error:", error);
      res.status(500).json({ error: "Failed to get pending tasks" });
    }
  });

  app.get("/api/events/today", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const events = await storage.getTodayEventsByFamily(familyMembership.familyId);
      res.json(events);
    } catch (error) {
      console.error("Today events error:", error);
      res.status(500).json({ error: "Failed to get today's events" });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const tasks = await storage.getTasksByFamily(familyMembership.familyId);
      res.json(tasks);
    } catch (error) {
      console.error("Tasks error:", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get the user's family member record to use as createdBy
      const userFamilyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!userFamilyMember) {
        return res.status(404).json({ error: "Family member record not found" });
      }

      const { title, description, dueDate, priority, assignedTo, category, points, estimatedTime, childProfileId } = req.body;

      // Check if assignedTo is a family member with a child profile
      let finalAssignedTo = assignedTo || null;
      let finalChildProfileId = childProfileId || null;

      if (assignedTo && !childProfileId) {
        // Check if this family member has a child profile
        const childProfile = await storage.getChildProfileByFamilyMember(assignedTo, userFamilyMember.id);
        if (childProfile) {
          // This is a child profile assignment
          finalAssignedTo = null;
          finalChildProfileId = childProfile.id;
        }
      }

      const task = await storage.createTask({
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority: priority || "medium",
        assignedTo: finalAssignedTo,
        createdBy: userFamilyMember.id,
        category: category || "general",
        points: points || 0,
        estimatedTime: estimatedTime || 0,
        childProfileId: finalChildProfileId
      });

      res.json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Parent task deletion endpoints
  app.delete("/api/tasks/:taskId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const taskId = parseInt(req.params.taskId);
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get the user's family member record
      const userFamilyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!userFamilyMember) {
        return res.status(404).json({ error: "Family member record not found" });
      }

      // Get the task to check permissions
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Allow parents to delete any task in their family
      const success = await storage.deleteTask(taskId);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.delete("/api/tasks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Allow parents to delete all tasks in their family
      await storage.deleteAllTasks(familyMembership.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete all tasks error:", error);
      res.status(500).json({ error: "Failed to delete all tasks" });
    }
  });

  app.get("/api/family-members", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const familyMembers = await storage.getFamilyMembersByFamily(familyMembership.familyId);
      
      // Enhance family members with teen usernames
      const enhancedMembers = await Promise.all(
        familyMembers.map(async (member) => {
          if (member.role === 'teen' && member.userId) {
            const teenProfile = await storage.getTeenProfileByUserId(member.userId);
            return {
              ...member,
              username: teenProfile?.username || null
            };
          }
          return member;
        })
      );
      
      res.json(enhancedMembers);
    } catch (error) {
      console.error("Family members error:", error);
      res.status(500).json({ error: "Failed to get family members" });
    }
  });

  app.post("/api/family-members", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const { name, role, color, avatar, phone, email, notificationPreference } = req.body;

      if (!name || !role) {
        return res.status(400).json({ error: "Name and role are required" });
      }

      const memberData = {
        name,
        role,
        color: color || "#3B82F6",
        avatar: avatar || null,
        phone: phone || null,
        email: email || null,
        notificationPreference: notificationPreference || "sms",
        familyId: familyMembership.familyId,
        canLogin: false,
        isActive: true
      };

      const newMember = await storage.createFamilyMember(memberData);
      res.json(newMember);
    } catch (error) {
      console.error("Family member creation error:", error);
      res.status(500).json({ error: "Failed to create family member" });
    }
  });

  app.delete("/api/family-members/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const memberId = parseInt(req.params.id);
      if (isNaN(memberId)) {
        return res.status(400).json({ error: "Invalid member ID" });
      }

      // Check if the family member exists and belongs to the user's family
      const member = await storage.getFamilyMemberById(memberId);
      if (!member) {
        return res.status(404).json({ error: "Family member not found" });
      }

      if (member.familyId !== familyMembership.familyId) {
        return res.status(403).json({ error: "Cannot delete family member from another family" });
      }

      // Don't allow deleting the current user's own family member record
      if (member.userId === req.session.userId) {
        return res.status(400).json({ error: "Cannot delete your own family member record" });
      }

      const success = await storage.deleteFamilyMember(memberId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete family member" });
      }
    } catch (error) {
      console.error("Family member deletion error:", error);
      res.status(500).json({ error: "Failed to delete family member" });
    }
  });

  app.get("/api/meal-plans", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userFamilyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!userFamilyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const mealPlans = await storage.getMealPlansByFamily(userFamilyMembership.familyId);
      res.json(mealPlans);
    } catch (error) {
      console.error("Meal plans error:", error);
      res.status(500).json({ error: "Failed to get meal plans" });
    }
  });

  app.post("/api/meal-plans", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const { day, mealType, meal, ingredients, notes, createdBy } = req.body;

      if (!day || !mealType || !meal) {
        return res.status(400).json({ error: "Missing required fields: day, mealType, meal" });
      }

      // Find a family member ID to use as createdBy (preferably the user)
      const familyMembers = await storage.getFamilyMembersByFamily(familyMembership.familyId);
      const userFamilyMember = familyMembers.find(fm => fm.userId === req.session.userId);
      const createdByMemberId = userFamilyMember?.id || familyMembers[0]?.id;

      if (!createdByMemberId) {
        return res.status(400).json({ error: "No family member found to create meal plan" });
      }

      const mealPlan = await storage.createMealPlan({
        day,
        mealType,
        meal,
        ingredients,
        notes,
        createdBy: createdByMemberId
      });

      res.json(mealPlan);
    } catch (error) {
      console.error("Create meal plan error:", error);
      res.status(500).json({ error: "Failed to create meal plan" });
    }
  });

  app.get("/api/grocery-items", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const groceryItems = await storage.getGroceryItemsByFamily(familyMembership.familyId);
      res.json(groceryItems);
    } catch (error) {
      console.error("Grocery items error:", error);
      res.status(500).json({ error: "Failed to get grocery items" });
    }
  });

  app.post("/api/grocery-items", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const { item, quantity, category } = req.body;

      if (!item || !quantity) {
        return res.status(400).json({ error: "Item name and quantity are required" });
      }

      // Find a family member ID to use as addedBy (preferably the user)
      const familyMembers = await storage.getFamilyMembersByFamily(familyMembership.familyId);
      const userFamilyMember = familyMembers.find(fm => fm.userId === req.session.userId);
      const addedByMemberId = userFamilyMember?.id || familyMembers[0]?.id;

      if (!addedByMemberId) {
        return res.status(400).json({ error: "No family member found to create grocery item" });
      }

      const groceryItem = await storage.createGroceryItem({
        item,
        quantity,
        category: category || "other",
        isCompleted: false,
        addedBy: addedByMemberId
      });

      res.json(groceryItem);
    } catch (error) {
      console.error("Create grocery item error:", error);
      res.status(500).json({ error: "Failed to create grocery item" });
    }
  });

  app.post("/api/grocery-items/share", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const { recipientFamilyMemberId, items } = req.body;

      if (!recipientFamilyMemberId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Recipient family member ID and items array are required" });
      }

      // Verify the recipient is in the same family
      const recipientMember = await storage.getFamilyMemberById(recipientFamilyMemberId);
      if (!recipientMember || recipientMember.familyId !== familyMembership.familyId) {
        return res.status(403).json({ error: "Can only share with family members" });
      }

      // Create grocery items for the recipient
      const createdItems = [];
      for (const item of items) {
        const groceryItem = await storage.createGroceryItem({
          item: item.item,
          quantity: item.quantity,
          category: item.category || "other",
          isCompleted: false,
          addedBy: recipientFamilyMemberId
        });
        createdItems.push(groceryItem);
      }

      res.json({ 
        success: true, 
        itemsCreated: createdItems.length,
        message: `Successfully shared ${createdItems.length} grocery items`
      });
    } catch (error) {
      console.error("Share grocery items error:", error);
      res.status(500).json({ error: "Failed to share grocery items" });
    }
  });

  // Parent events endpoints
  app.post("/api/events", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get the user's family member record
      const userFamilyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!userFamilyMember) {
        return res.status(404).json({ error: "Family member record not found" });
      }

      const { title, description, startTime, endTime, location, assignedTo, isAllDay, isPrivate, visibilityType, sharedWith } = req.body;

      if (!title || !startTime) {
        return res.status(400).json({ error: "Title and start time are required" });
      }

      // Create the event data
      const eventData = {
        title,
        description: description || "",
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        location: location || "",
        familyId: familyMembership.familyId,
        assignedTo: assignedTo || [], // Array of family member IDs
        isAllDay: isAllDay || false,
        isPrivate: isPrivate || false,
        visibilityType: visibilityType || "shared",
        sharedWith: sharedWith || [],
        createdBy: userFamilyMember.id
      };

      const newEvent = await storage.createEvent(eventData);
      res.json(newEvent);
    } catch (error) {
      console.error("Parent event creation error:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.get("/api/events", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const events = await storage.getEventsByFamily(familyMembership.familyId);
      res.json(events);
    } catch (error) {
      console.error("Parent events fetch error:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Parent update event endpoint
  app.put("/api/events/:eventId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const eventId = parseInt(req.params.eventId);
      const updates = req.body;
      
      console.log("Event update request body:", JSON.stringify(updates, null, 2));

      // Get family membership for the user
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(403).json({ error: "No family access" });
      }

      // Check if the event exists and belongs to the user's family
      const existingEvent = await storage.getEventById(eventId);
      if (!existingEvent) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (existingEvent.familyId !== familyMembership.familyId) {
        return res.status(403).json({ error: "Not authorized to update this event" });
      }

      // Convert string dates back to Date objects for database
      const processedUpdates = {
        ...updates,
        startTime: updates.startTime ? new Date(updates.startTime) : undefined,
        endTime: updates.endTime ? new Date(updates.endTime) : undefined,
      };
      
      console.log("Processed updates:", JSON.stringify(processedUpdates, null, 2));

      // Update the event
      const updatedEvent = await storage.updateEvent(eventId, processedUpdates);
      if (!updatedEvent) {
        return res.status(404).json({ error: "Failed to update event" });
      }

      res.json(updatedEvent);
    } catch (error) {
      console.error("Event update error:", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  // Parent delete event endpoint
  app.delete("/api/events/:eventId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const eventId = parseInt(req.params.eventId);
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get the event to check it exists and belongs to the family
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Verify event belongs to the user's family
      if (event.familyId !== familyMembership.familyId) {
        return res.status(403).json({ error: "Event does not belong to your family" });
      }

      // Delete the event
      await storage.deleteEvent(eventId);
      res.json({ success: true });
    } catch (error) {
      console.error("Parent event delete error:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.get("/api/events/today", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const todayEvents = await storage.getTodayEventsByFamily(familyMembership.familyId);
      res.json(todayEvents);
    } catch (error) {
      console.error("Today events error:", error);
      res.status(500).json({ error: "Failed to get today's events" });
    }
  });

  app.get("/api/passwords", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const passwords = await storage.getPasswords();
      res.json(passwords);
    } catch (error) {
      console.error("Passwords error:", error);
      res.status(500).json({ error: "Failed to get passwords" });
    }
  });

  app.post("/api/passwords", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get the parent's family member record
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      const { title, category, website, username, email, password, notes, sharedWith, isFavorite } = req.body;

      if (!title || !password) {
        return res.status(400).json({ error: "Title and password are required" });
      }

      // Create the password entry
      const passwordData = {
        title,
        category: category || "other",
        website: website || "",
        username: username || "",
        email: email || "",
        password, // In production, this should be encrypted
        notes: notes || "",
        createdBy: familyMember.id,
        sharedWith: sharedWith || "[]", // Default to not shared
        isFavorite: isFavorite || false
      };

      const newPassword = await storage.createPassword(passwordData);
      res.json(newPassword);
    } catch (error) {
      console.error("Password creation error:", error);
      res.status(500).json({ error: "Failed to create password" });
    }
  });

  app.patch("/api/passwords/:id/favorite", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const passwordId = parseInt(req.params.id);
      const { isFavorite } = req.body;

      // Get the parent's family member record
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Verify the password exists and belongs to this family
      const existingPassword = await storage.getPasswordById(passwordId);
      if (!existingPassword) {
        return res.status(404).json({ error: "Password not found" });
      }

      // Check if user can modify this password (must be creator or admin)
      if (existingPassword.createdBy !== familyMember.id) {
        return res.status(403).json({ error: "You can only modify passwords you created" });
      }

      const updatedPassword = await storage.updatePassword(passwordId, { isFavorite });
      
      res.json(updatedPassword);
    } catch (error) {
      console.error("Password favorite update error:", error);
      res.status(500).json({ error: "Failed to update password favorite status" });
    }
  });

  app.delete("/api/passwords/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const passwordId = parseInt(req.params.id);
      
      // Get the parent's family member record
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Verify the password exists and belongs to this family
      const existingPassword = await storage.getPasswordById(passwordId);
      if (!existingPassword) {
        return res.status(404).json({ error: "Password not found" });
      }

      // Check if user can delete this password (must be creator or admin)
      if (existingPassword.createdBy !== familyMember.id) {
        return res.status(403).json({ error: "You can only delete passwords you created" });
      }

      await storage.deletePassword(passwordId);
      res.json({ success: true });
    } catch (error) {
      console.error("Password deletion error:", error);
      res.status(500).json({ error: "Failed to delete password" });
    }
  });

  app.delete("/api/passwords", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // For "Remove All", parents can delete all family passwords
      if (familyMember.role === 'parent' || familyMember.role === 'mom' || familyMember.role === 'dad') {
        // Delete all passwords for this family
        await storage.deletePasswordsByFamily(familyMember.familyId);
      } else {
        // Non-parents can only delete their own passwords
        await storage.deletePasswordsByCreator(familyMember.id);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Bulk password deletion error:", error);
      res.status(500).json({ error: "Failed to delete passwords" });
    }
  });

  // Voice Notes Endpoints
  app.post("/api/voice-notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { content, transcription } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Voice note content is required" });
      }

      // Get current user's family member
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Create voice note
      const voiceNote = await storage.createVoiceNote({
        content,
        transcription: transcription || content,
        createdBy: familyMember.id
      });
      
      res.json(voiceNote);
    } catch (error) {
      console.error("Voice note creation error:", error);
      res.status(500).json({ error: "Failed to create voice note" });
    }
  });

  app.get("/api/voice-notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get current user's family member
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get voice notes for this family
      const voiceNotes = await storage.getVoiceNotesByCreator(familyMember.id);
      
      res.json(voiceNotes);
    } catch (error) {
      console.error("Voice notes fetch error:", error);
      res.status(500).json({ error: "Failed to fetch voice notes" });
    }
  });

  app.get("/api/voice-notes/recent", async (req, res) => {
    try {
      console.log("Voice notes recent - Session data:", {
        hasSession: !!req.session,
        userId: req.session?.userId,
        sessionId: req.sessionID
      });
      
      if (!req.session.userId) {
        console.log("Voice notes recent - Authentication failed");
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get current user's family membership
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get recent voice notes for this family
      const recentVoiceNotes = await storage.getRecentVoiceNotesByFamily(familyMembership.familyId);
      
      res.json(recentVoiceNotes);
    } catch (error) {
      console.error("Recent voice notes fetch error:", error);
      res.status(500).json({ error: "Failed to fetch recent voice notes" });
    }
  });

  // Text Notes Endpoints
  app.get("/api/text-notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get current user's family membership
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get text notes for this family
      const textNotes = await storage.getTextNotesByFamily(familyMembership.familyId);
      
      res.json(textNotes);
    } catch (error) {
      console.error("Text notes fetch error:", error);
      res.status(500).json({ error: "Failed to fetch text notes" });
    }
  });

  app.get("/api/text-notes/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: "Invalid note ID" });
      }

      // Get current user's family membership
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get the text note (only if it belongs to this family)
      const textNote = await storage.getTextNoteById(noteId, familyMembership.familyId);
      if (!textNote) {
        return res.status(404).json({ error: "Text note not found" });
      }

      res.json(textNote);
    } catch (error) {
      console.error("Text note fetch error:", error);
      res.status(500).json({ error: "Failed to fetch text note" });
    }
  });

  app.post("/api/text-notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      // Get current user's family membership
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get the family member record to get the correct ID
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Create new text note for this family
      const newNote = await storage.createTextNote({
        title,
        content,
        familyId: familyMembership.familyId,
        createdBy: familyMember.id
      });

      res.status(201).json(newNote);
    } catch (error) {
      console.error("Text note creation error:", error);
      res.status(500).json({ error: "Failed to create text note" });
    }
  });

  app.put("/api/text-notes/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: "Invalid note ID" });
      }

      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      // Get current user's family membership
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Verify the note exists and belongs to this family
      const existingNote = await storage.getTextNoteById(noteId, familyMembership.familyId);
      if (!existingNote) {
        return res.status(404).json({ error: "Text note not found" });
      }

      // Update the text note
      const updatedNote = await storage.updateTextNote(noteId, { title, content }, familyMembership.familyId);
      if (!updatedNote) {
        return res.status(404).json({ error: "Failed to update text note" });
      }

      res.json(updatedNote);
    } catch (error) {
      console.error("Text note update error:", error);
      res.status(500).json({ error: "Failed to update text note" });
    }
  });

  app.delete("/api/text-notes/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: "Invalid note ID" });
      }

      // Get current user's family membership
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Verify the note exists and belongs to this family
      const existingNote = await storage.getTextNoteById(noteId, familyMembership.familyId);
      if (!existingNote) {
        return res.status(404).json({ error: "Text note not found" });
      }

      // Delete the text note
      const deleted = await storage.deleteTextNote(noteId);
      if (!deleted) {
        return res.status(404).json({ error: "Text note not found or access denied" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Text note deletion error:", error);
      res.status(500).json({ error: "Failed to delete text note" });
    }
  });

  // Notifications Endpoints
  app.get("/api/notifications/pending", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get current user's family member
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get pending notifications for this user
      const notifications = await storage.getNotifications(familyMember.id);
      const pendingNotifications = notifications.filter(n => !n.sentAt);
      
      res.json(pendingNotifications);
    } catch (error) {
      console.error("Fetch pending notifications error:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.delete("/api/notifications/clear-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get current user's family membership
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Clear all notifications for this family
      const deletedCount = await storage.clearAllNotificationsByFamily(familyMembership.familyId);
      
      res.json({ success: true, deletedCount });
    } catch (error) {
      console.error("Clear all notifications error:", error);
      res.status(500).json({ error: "Failed to clear notifications" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return res.status(400).json({ error: "Invalid notification ID" });
      }

      // Delete the notification
      const deleted = await storage.deleteNotification(notificationId);
      if (!deleted) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // AI Smart Task Creation Endpoint
  app.post("/api/ai/smart-task-creation", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { voiceInput, familyMembers } = req.body;
      
      if (!voiceInput) {
        return res.status(400).json({ error: "Voice input is required" });
      }

      // Get current user's family members if not provided
      let members = familyMembers;
      if (!members) {
        const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
        if (familyMember) {
          members = await storage.getFamilyMembersByFamilyId(familyMember.familyId);
        }
      }

      // Call the AI processing function
      const result = await smartTaskCreation(voiceInput, members || []);
      
      res.json(result);
    } catch (error) {
      console.error("AI smart task creation error:", error);
      res.status(500).json({ 
        error: "Failed to process voice input",
        tasks: [],
        interpretation: "I couldn't process that request. Please try again."
      });
    }
  });

  // Password Reset Endpoints
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { email, username } = req.body;
      
      if (!email && !username) {
        return res.status(400).json({ error: "Email or username is required" });
      }

      let user;
      let isTeenUser = false;
      
      // Check if it's a teen login (username provided)
      if (username) {
        const teenProfile = await storage.getTeenProfileByUsername(username);
        if (teenProfile) {
          user = await storage.getUserById(teenProfile.userId);
          isTeenUser = true;
        }
      } else {
        // Parent login (email provided)
        user = await storage.getUserByEmail(email);
      }
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (isTeenUser) {
        // Teens must contact their parent for password reset
        return res.status(400).json({ 
          error: "Please ask your parent to reset your password from Family Settings → Family Members." 
        });
      } else {
        // For parents, send SMS reset token
        const phoneNumber = await storage.getFamilyMemberPhoneNumber(user.id);
        if (!phoneNumber) {
          return res.status(400).json({ 
            error: "No phone number on file. Please contact support for help." 
          });
        }
        
        // Generate 6-digit reset code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store the token
        await storage.createSMSPasswordResetToken(user.id, phoneNumber, resetCode);
        
        // Send SMS
        const message = `Your Mom App password reset code is: ${resetCode}. This code expires in 1 hour.`;
        const smsSent = await sendSMS(phoneNumber, message);
        
        if (!smsSent) {
          return res.status(500).json({ error: "Failed to send SMS. Please try again." });
        }
        
        res.json({
          resetType: "sms",
          message: "Password reset code sent to your phone."
        });
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  // Verify SMS code for parents (without resetting password)
  app.post("/api/auth/verify-sms-code", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "SMS code is required" });
      }

      // Just verify the token exists and is valid, don't mark as used yet
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.resetType !== "sms") {
        return res.status(400).json({ error: "Invalid or expired SMS code" });
      }

      res.json({
        success: true,
        token: resetToken.token,
        message: "SMS code verified successfully"
      });
    } catch (error) {
      console.error("SMS code verification error:", error);
      res.status(500).json({ error: "Failed to verify SMS code" });
    }
  });

  // Verify security questions for teens
  app.post("/api/auth/verify-security-questions", async (req, res) => {
    try {
      const { username, answers } = req.body;
      
      if (!username || !answers || answers.length !== 2) {
        return res.status(400).json({ error: "Username and two security answers required" });
      }

      const teenProfile = await storage.getTeenProfileByUsername(username);
      if (!teenProfile) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = await storage.verifyTeenSecurityAnswers(
        teenProfile.userId, 
        answers[0], 
        answers[1]
      );

      if (!isValid) {
        return res.status(400).json({ error: "Incorrect security answers" });
      }

      // Generate a temporary reset token for the validated teen
      const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await storage.createPasswordResetToken({
        userId: teenProfile.userId,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        resetType: "security_questions",
        isUsed: false,
      });

      res.json({
        success: true,
        resetToken: resetToken,
        message: "Security questions verified. You can now reset your password."
      });
    } catch (error) {
      console.error("Security question verification error:", error);
      res.status(500).json({ error: "Failed to verify security questions" });
    }
  });

  // Reset password (final step)
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      // Verify the reset token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      // Update the user's password
      await storage.updateUserPassword(resetToken.userId, passwordHash);
      
      // Mark the token as used
      await storage.markPasswordResetTokenUsed(resetToken.id);

      res.json({
        success: true,
        message: "Password reset successfully"
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Set security questions for teens
  app.post("/api/teen/security-questions", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { question1, answer1, question2, answer2 } = req.body;
      
      if (!question1 || !answer1 || !question2 || !answer2) {
        return res.status(400).json({ error: "All security questions and answers are required" });
      }

      const teenProfile = await storage.getTeenProfileByUserId(req.session.userId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      await storage.setTeenSecurityQuestions(
        teenProfile.id, 
        question1, 
        answer1.toLowerCase().trim(), 
        question2, 
        answer2.toLowerCase().trim()
      );

      res.json({
        success: true,
        message: "Security questions saved successfully"
      });
    } catch (error) {
      console.error("Security questions setup error:", error);
      res.status(500).json({ error: "Failed to save security questions" });
    }
  });

  // Parent-managed teen password reset
  app.post("/api/family-members/:teenId/reset-password", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const teenId = parseInt(req.params.teenId);
      const { newPassword } = req.body;
      
      if (isNaN(teenId)) {
        return res.status(400).json({ error: "Invalid teen ID" });
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      // Get the teen profile
      const teenProfile = await storage.getTeenProfile(teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      // Get the teen's family member record
      const teenFamilyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!teenFamilyMember) {
        return res.status(404).json({ error: "Teen family member not found" });
      }

      // Get the parent's family member record
      const parentFamilyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!parentFamilyMember) {
        return res.status(404).json({ error: "Parent family member not found" });
      }

      // Verify they're in the same family
      if (teenFamilyMember.familyId !== parentFamilyMember.familyId) {
        return res.status(403).json({ error: "Not authorized to manage this teen's password" });
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update the teen's password
      await storage.updateUserPassword(teenProfile.userId, passwordHash);

      // Create notification for parent about password reset
      await storage.createNotification({
        type: "password_reset",
        title: "Teen Password Reset",
        message: `You reset ${teenProfile.firstName}'s password successfully.`,
        recipientId: parentFamilyMember.id,
        scheduledFor: new Date(),
        deliveryMethod: "app",
        status: "pending"
      });

      res.json({
        success: true,
        message: `Password reset successfully for ${teenProfile.firstName}`
      });
    } catch (error) {
      console.error("Teen password reset error:", error);
      res.status(500).json({ error: "Failed to reset teen password" });
    }
  });


  return server;
}