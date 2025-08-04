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
              favoriteColor: teenProfile.favoriteColor
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

      // Set teen session
      req.session.teenId = teenProfile.id;
      req.session.userId = user.id;

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
            favoriteColor: existingTeen.favoriteColor
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
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's family member record to find familyId
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const familyMember = await storage.getFamilyMemberById(teenProfile.familyMemberId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get events for the family
      const events = await storage.getEventsByFamily(familyMember.familyId);
      
      // Filter to show only events that are relevant to this teen (assigned to them or family-wide)
      const relevantEvents = events.filter((event: any) => 
        !event.assignedTo || event.assignedTo === teenProfile.familyMemberId
      );
      
      res.json(relevantEvents);
    } catch (error) {
      console.error("Teen events fetch error:", error);
      res.status(500).json({ error: "Failed to fetch events" });
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
              status: "pending",
              assignedTo: familyMember.id,
              teenId: existingTeen.id,
              points: 10,
              category: "chores",
              estimatedTime: 30,
              familyId: familyMember.familyId,
              createdBy: 1
            });

            await storage.createTask({
              title: "Math homework",
              description: "Complete algebra problems 1-20",
              dueDate: tomorrow,
              priority: "high",
              status: "pending",
              assignedTo: familyMember.id,
              teenId: existingTeen.id,
              points: 15,
              category: "homework",
              estimatedTime: 45,
              familyId: familyMember.familyId,
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

  return server;
}