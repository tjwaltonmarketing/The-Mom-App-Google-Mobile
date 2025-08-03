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

  // Test endpoint to create sample teen data
  app.post("/api/setup-test-teen", async (req, res) => {
    console.log("Setting up test teen data...");
    try {
      // Check if teen already exists
      const existingTeen = await storage.getTeenProfileByUsername("AdriWalton1");
      if (existingTeen) {
        return res.json({ message: "Test teen already exists", teenId: existingTeen.id });
      }
      
      // Create a test family first
      const user = await storage.createUser({
        email: "test@family.com",
        passwordHash: await bcrypt.hash("testpassword", 10),
        firstName: "Test",
        lastName: "Parent"
      });
      
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
      
      res.json({ 
        message: "Test teen created successfully",
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