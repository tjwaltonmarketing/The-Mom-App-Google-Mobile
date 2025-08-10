import { Express } from "express";
import { createServer } from "http";
import { DatabaseStorage } from "./storage";
import bcrypt from "bcryptjs";

const storage = new DatabaseStorage();

export async function registerRoutes(app: Express) {
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

      // Set user session
      req.session.userId = user.id;
      req.session.teenId = undefined; // Clear any teen session
      
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
      // Check if user is authenticated via session
      if (req.session.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          return res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isVerified: user.isVerified
          });
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

      // Set teen session and save synchronously
      req.session.teenId = teenProfile.id;
      req.session.userId = user.id;
      
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
        req.session.userId = existingTeen.userId;
        
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

      // Set session
      req.session.teenId = teenProfile.id;
      req.session.userId = user.id;
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
        assignedTo: teenProfile.familyMemberId, // Assign to the teen
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

  // Test endpoint to create sample teen data
  app.post("/api/setup-test-teen", async (req, res) => {
    console.log("Setting up test teen data...");
    try {
      // Check if teen already exists
      const existingTeen = await storage.getTeenProfileByUsername("AdriWalton1");
      if (existingTeen) {
        console.log("Test teen already exists, adding sample tasks...");
        
        // Just add sample tasks to existing teen
        const familyMember = await storage.getFamilyMemberById(existingTeen.familyMemberId);
        if (familyMember) {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          // Check if tasks already exist to avoid duplicates
          const existingTasks = await storage.getTasksForTeen(existingTeen.id);
          if (existingTasks.length === 0) {
            await storage.createTask({
              title: "Clean your room",
              description: "Organize desk, make bed, and put clothes away",
              dueDate: today,
              priority: "medium",
              assignedTo: familyMember.id,
              teenId: existingTeen.id,
              points: 10,
              category: "chores",
              estimatedTime: 30,
              createdBy: 1
            });

            await storage.createTask({
              title: "Math homework",
              description: "Complete algebra problems 1-20",
              dueDate: tomorrow,
              priority: "high",
              assignedTo: familyMember.id,
              teenId: existingTeen.id,
              points: 15,
              category: "homework",
              estimatedTime: 45,
              createdBy: 1
            });
          }
        }

        return res.json({ 
          message: "Test teen already exists with sample data",
          teenId: existingTeen.id,
          username: "AdriWalton1",
          password: "Welcome1!"
        });
      }
      
      // Create a test family first (check if it exists)
      let user = await storage.getUserByEmail("test@family.com");
      if (!user) {
        user = await storage.createUser({
          email: "test@family.com",
          passwordHash: await bcrypt.hash("testpassword", 10),
          firstName: "Test",
          lastName: "Parent"
        });
      }
      
      const family = await storage.createFamily({
        name: "Walton Family",
        ownerId: user.id
      });
      
      await storage.createFamilyMembership({
        userId: user.id,
        familyId: family.id,
        role: "owner"
      });
      
      // Create teen user account
      const teenUser = await storage.createUser({
        email: "adri@teen.local",
        passwordHash: await bcrypt.hash("Welcome1!", 10),
        firstName: "Adri",
        lastName: "Walton"
      });
      
      // Create family member record
      const familyMember = await storage.createFamilyMember({
        name: "Adri Walton",
        role: "teen",
        color: "#8B5CF6",
        avatar: "A",
        userId: teenUser.id,
        familyId: family.id,
        canLogin: true,
        isActive: true
      });
      
      // Create teen profile
      const teenProfile = await storage.createTeenProfile({
        userId: teenUser.id,
        familyMemberId: familyMember.id,
        firstName: "Adri",
        lastName: "Walton",
        username: "AdriWalton1",
        age: 16,
        favoriteColor: "#8B5CF6"
      });
      
      // Create notification settings
      await storage.createTeenNotificationSettings({
        teenProfileId: teenProfile.id,
        taskReminders: true,
        eventNotifications: true,
        dailyDigest: true,
        quietHours: true,
        quietStart: "22:00",
        quietEnd: "08:00"
      });

      // Create some sample tasks for the teen
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await storage.createTask({
        title: "Clean your room",
        description: "Organize desk, make bed, and put clothes away",
        dueDate: today,
        priority: "medium",
        assignedTo: familyMember.id,
        teenId: teenProfile.id,
        points: 10,
        category: "chores",
        estimatedTime: 30,
        createdBy: 1, // Created by mom
        isCompleted: false
      });

      await storage.createTask({
        title: "Math homework",
        description: "Complete algebra problems 1-20",
        dueDate: tomorrow,
        priority: "high",
        assignedTo: familyMember.id,
        teenId: teenProfile.id,
        points: 15,
        category: "homework",
        estimatedTime: 45,
        createdBy: 1,
        isCompleted: false
      });

      // Create some sample events
      const eventStartTime = new Date(today);
      eventStartTime.setHours(16, 0, 0, 0); // 4:00 PM today

      await storage.createEvent({
        title: "Soccer Practice",
        description: "Weekly soccer practice at the local field",
        location: "Community Sports Field",
        startTime: eventStartTime,
        endTime: new Date(eventStartTime.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        isAllDay: false,
        assignedTo: familyMember.id,
        createdBy: 1
      });

      const dinnerTime = new Date(today);
      dinnerTime.setHours(18, 30, 0, 0); // 6:30 PM today

      await storage.createEvent({
        title: "Family Dinner",
        description: "Weekly family dinner together",
        location: "Home",
        startTime: dinnerTime,
        endTime: new Date(dinnerTime.getTime() + 1.5 * 60 * 60 * 1000), // 1.5 hours later
        isAllDay: false,
        assignedTo: null, // Family-wide event
        createdBy: 1
      });
      
      res.json({ 
        message: "Test teen created successfully with sample data",
        teenId: teenProfile.id,
        username: "AdriWalton1",
        password: "Welcome1!"
      });
    } catch (error) {
      console.error("Setup test teen error:", error);
      res.status(500).json({ error: "Failed to create test teen" });
    }
  });

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

      const { title, description, dueDate, priority, assignedTo, category, points, estimatedTime } = req.body;

      const task = await storage.createTask({
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority: priority || "medium",
        assignedTo: assignedTo || null,
        createdBy: userFamilyMember.id,
        category: category || "general",
        points: points || 0,
        estimatedTime: estimatedTime || 0
      });

      res.json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
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
      res.json(familyMembers);
    } catch (error) {
      console.error("Family members error:", error);
      res.status(500).json({ error: "Failed to get family members" });
    }
  });

  app.get("/api/meal-plans", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const mealPlans = await storage.getMealPlans();
      res.json(mealPlans);
    } catch (error) {
      console.error("Meal plans error:", error);
      res.status(500).json({ error: "Failed to get meal plans" });
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

      const groceryItems = await storage.getGroceryItems();
      res.json(groceryItems);
    } catch (error) {
      console.error("Grocery items error:", error);
      res.status(500).json({ error: "Failed to get grocery items" });
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

  return server;
}