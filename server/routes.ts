import { Express } from "express";
import crypto from "crypto";
import { createServer } from "http";
import { DatabaseStorage } from "./storage";
import { smartTaskCreation } from "./ai";
import { WeatherService } from "./weather-service";
import { sendSMS } from "./sms-service";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { users } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { GoogleCalendarService } from "./google-calendar-service";
import { generateToken, verifyToken, extractTokenFromRequest, jwtSessionBridge } from "./auth";
import bcrypt from "bcryptjs";
import { createCheckoutSession, handleWebhookEvent, stripe, initializeStripeProducts } from "./stripe";
import { emailService, createBrandedEmailTemplate } from "./email-service";
import { notificationService } from "./notification-service";
import { OAuth2Client } from "google-auth-library";

const storage = new DatabaseStorage();

// In-memory store for pending Android Google OAuth tokens (keyed by state, TTL 5 min)
const pendingGoogleTokens = new Map<string, { token: string; userId: number; createdAt: number }>();
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [key, value] of pendingGoogleTokens.entries()) {
    if (value.createdAt < cutoff) pendingGoogleTokens.delete(key);
  }
}, 60 * 1000);

// Helper function to check if user is on Individual plan (trial users always have full access)
async function isUserOnIndividualPlan(userId: number): Promise<boolean> {
  const subscription = await storage.getUserSubscription(userId);
  if (!subscription) {
    // Check if user is family member (not owner) - get owner's subscription
    const family = await storage.getFamilyByUserId(userId);
    if (family && family.ownerId !== userId) {
      const ownerSubscription = await storage.getUserSubscription(family.ownerId);
      if (!ownerSubscription) return false;
      const ownerOnTrial = ownerSubscription.subscriptionStatus === "trial" && ownerSubscription.trialEndDate && new Date(ownerSubscription.trialEndDate) > new Date();
      if (ownerOnTrial) return false;
      return ownerSubscription.subscriptionPlan === "individual";
    }
    return false;
  }
  // Trial users have full access — not restricted to individual plan limits
  const isOnTrial = subscription.subscriptionStatus === "trial" && subscription.trialEndDate && new Date(subscription.trialEndDate) > new Date();
  if (isOnTrial) return false;
  return subscription.subscriptionPlan === "individual";
}

export async function registerRoutes(app: Express) {
  // Android App Links verification file — must be served at this exact path
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json([{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.momapp.family",
        sha256_cert_fingerprints: [
          "80:ED:AD:60:02:83:88:9F:1A:47:F8:34:DE:1A:32:A8:6A:80:4E:C6:3F:A8:C7:37:F8:E5:09:71:45:15:01:1D",
          "F3:8E:D4:2E:DC:F8:2A:B7:9E:E3:20:C7:8C:CE:8C:9F:EE:B8:45:38:7F:79:B4:CF:45:AA:B6:01:72:EE:EE:34"
        ]
      }
    }]);
  });

  // Setup Replit Auth first (handles sessions, passport, login/logout routes)
  await setupAuth(app);
  
  app.use("/api", jwtSessionBridge);
  
  // Create HTTP server
  const server = createServer(app);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      hasSession: !!req.session,
      hasUserId: !!req.session?.userId,
      hasAuthHeader: !!req.headers.authorization,
    });
  });

  // Placeholder for API routes
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working" });
  });

  // Public config endpoint (non-sensitive values only)
  app.get("/api/config/google-client-id", (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID || "" });
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
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, familyName, phoneNumber, inviteCode, familyId, plan, interval } = req.body;
      
      // If joining via invite, familyName is optional
      const isJoiningFamily = inviteCode && familyId;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }
      
      const resolvedFamilyName = familyName || "My Family";

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      // If joining via invite, validate the invite
      let targetFamilyId = familyId;
      if (isJoiningFamily) {
        const invite = await storage.getFamilyInvite(inviteCode);
        if (!invite || invite.status !== 'pending') {
          return res.status(400).json({ error: "Invalid or expired invite code" });
        }
        targetFamilyId = invite.familyId;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phoneNumber: phoneNumber || null,
        authMethod: 'email',
        isVerified: false
      });

      let family;
      if (isJoiningFamily) {
        // Get existing family
        const familyResult = await db.execute(sql`SELECT * FROM families WHERE id = ${targetFamilyId}`);
        family = familyResult.rows[0];
        
        // Mark invite as accepted
        await storage.acceptFamilyInvite(inviteCode, newUser.id);
      } else {
        // Create new family
        family = await storage.createFamily({
          name: resolvedFamilyName,
          ownerId: newUser.id
        });
      }

      // Create family member linking user to family
      await storage.createFamilyMember({
        userId: newUser.id,
        familyId: family.id,
        name: `${firstName} ${lastName}`,
        role: 'parent',
        color: isJoiningFamily ? '#3B82F6' : '#EC4899', // Blue for invited parent, pink for owner
        avatar: firstName.charAt(0).toUpperCase(),
        notificationPreference: 'sms',
        canLogin: true,
        isActive: true
      });

      // Create family membership entry (required for getFamilyByUserId to work)
      await storage.createFamilyMembership({
        userId: newUser.id,
        familyId: family.id,
        role: isJoiningFamily ? 'member' : 'owner'
      });

      // Set session to auto-login
      req.session.userId = newUser.id;
      delete req.session.teenId; // Clear teen session
      
      // Save session synchronously
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("Registration session saved successfully for user:", newUser.id);
            resolve();
          }
        });
      });

      // Generate JWT token for cross-domain authentication
      const token = generateToken(newUser.id);

      // Admin signup SMS notifications disabled to reduce costs

      res.json({
        success: true,
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          isVerified: newUser.isVerified
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

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

      // Generate JWT token for cross-domain authentication
      const token = generateToken(user.id);

      res.json({
        success: true,
        token,
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

  // Google Sign-In
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: "Google credential is required" });
      }

      const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ error: "Invalid Google token" });
      }

      const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: profileImageUrl } = payload;

      // Check if user exists by Google ID
      let user = await storage.getUserByGoogleId(googleId!);

      if (!user) {
        // Check if user exists by email (they registered with email/password before)
        user = await storage.getUserByEmail(email.toLowerCase());
        if (user) {
          // Link Google account to existing user
          await db.execute(sql`UPDATE users SET google_id = ${googleId}, auth_method = 'google', profile_image_url = COALESCE(profile_image_url, ${profileImageUrl}), is_verified = true WHERE id = ${user.id}`);
          user = await storage.getUserById(user.id);
        } else {
          // Create new user with Google account
          user = await storage.createUser({
            email: email.toLowerCase(),
            googleId: googleId!,
            firstName: firstName || null,
            lastName: lastName || null,
            profileImageUrl: profileImageUrl || null,
            authMethod: 'google',
            isVerified: true,
          });

          // Create a family for the new user
          const family = await storage.createFamily({
            name: `${firstName || 'My'}'s Family`,
            ownerId: user.id
          });

          // Create family member
          await storage.createFamilyMember({
            userId: user.id,
            familyId: family.id,
            name: `${firstName || ''} ${lastName || ''}`.trim(),
            role: 'parent',
            color: '#EC4899',
            avatar: (firstName || 'U').charAt(0).toUpperCase(),
            notificationPreference: 'sms',
            canLogin: true,
            isActive: true
          });

          // Create family membership
          await storage.createFamilyMembership({
            userId: user.id,
            familyId: family.id,
            role: 'owner'
          });

          // Admin signup SMS notifications disabled to reduce costs
        }
      }

      if (!user) {
        return res.status(500).json({ error: "Failed to create or find user" });
      }

      // Set session
      req.session.userId = user.id;
      delete req.session.teenId;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const token = generateToken(user.id);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          isVerified: user.isVerified
        }
      });
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).json({ error: "Google authentication failed" });
    }
  });

  // Google Sign-In via server-side OAuth redirect (for Android WebView where JS SDK is blocked)
  // Accepts an optional `state` param so the native app can poll for the token after OAuth completes
  app.get("/api/auth/google/redirect", (req, res) => {
    try {
      const state = (req.query.state as string) || "";
      const redirectUri = `https://app.themom.app/api/auth/google/redirect/callback`;
      const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      const url = client.generateAuthUrl({
        access_type: "online",
        scope: ["profile", "email"],
        prompt: "select_account",
        state, // Google passes state through to the callback unchanged
      });
      res.redirect(url);
    } catch (error) {
      console.error("Google OAuth redirect start error:", error);
      res.redirect("/?error=google_auth_failed");
    }
  });

  app.get("/api/auth/google/redirect/callback", async (req, res) => {
    const state = (req.query.state as string) || "";

    const sendSuccessPage = (isNativeApp: boolean) => {
      res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Signed In – The Mom App</title>
        <style>
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fdf4ff;color:#333;padding:24px;box-sizing:border-box}
          .card{background:#fff;border-radius:16px;padding:32px 24px;max-width:360px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
          h1{font-size:24px;margin:16px 0 8px;color:#7c3aed}
          .check{font-size:56px;margin-bottom:4px}
          .sub{color:#666;margin:0 0 20px;font-size:15px}
          .back-box{background:#f3f0ff;border:2px solid #7c3aed;border-radius:12px;padding:20px 16px;margin-top:8px}
          .back-arrow{font-size:40px;margin-bottom:8px}
          .back-label{font-size:17px;font-weight:700;color:#7c3aed;margin:0 0 4px}
          .back-hint{font-size:13px;color:#555;margin:0}
          .btn{display:block;background:#7c3aed;color:#fff;padding:14px 24px;border-radius:10px;font-weight:600;font-size:16px;margin-top:16px;cursor:pointer;border:none;width:100%}
        </style></head><body>
        <div class="card">
          <div class="check">✅</div>
          <h1>You're signed in!</h1>
          <p class="sub">Your account is ready. Now return to the app:</p>
          <div class="back-box" id="back-box">
            <div class="back-arrow">◀</div>
            <p class="back-label" id="back-label">Return to The Mom App</p>
            <p class="back-hint" id="back-hint">Tap the button below or swipe back to return to the app</p>
          </div>
          <button class="btn" onclick="tryReturn()">← Return to The Mom App</button>
        </div>
        <script>
          var ua = navigator.userAgent;
          var isIOS = /iPad|iPhone|iPod/.test(ua);
          var isAndroid = /Android/.test(ua);
          if (isAndroid) {
            document.getElementById('back-hint').textContent = 'Press the ← back button at the bottom of your phone to return to The Mom App';
          } else if (isIOS) {
            document.getElementById('back-hint').textContent = 'Tap the button below or swipe from the left edge to return to The Mom App';
          }
          function tryReturn() {
            window.location.href = 'momapp://auth/google-complete';
            setTimeout(function() {
              try { window.close(); } catch(e) {}
              window.history.back();
            }, 500);
          }
        </script>
      </body></html>`);
    };

    try {
      const { code, error } = req.query;
      if (error || !code) {
        return sendSuccessPage(!!state);
      }

      const redirectUri = `https://app.themom.app/api/auth/google/redirect/callback`;
      const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      const { tokens } = await client.getToken(code as string);
      client.setCredentials(tokens);

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID!,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return sendSuccessPage(!!state);
      }

      const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: profileImageUrl } = payload;

      let user = await storage.getUserByGoogleId(googleId!);
      if (!user) {
        user = await storage.getUserByEmail(email.toLowerCase());
        if (user) {
          await db.execute(sql`UPDATE users SET google_id = ${googleId}, auth_method = 'google', profile_image_url = COALESCE(profile_image_url, ${profileImageUrl}), is_verified = true WHERE id = ${user.id}`);
          user = await storage.getUserById(user.id);
        } else {
          user = await storage.createUser({
            email: email.toLowerCase(),
            googleId: googleId!,
            firstName: firstName || null,
            lastName: lastName || null,
            profileImageUrl: profileImageUrl || null,
            authMethod: "google",
            isVerified: true,
          });
          const family = await storage.createFamily({
            name: `${firstName || "My"}'s Family`,
            ownerId: user.id,
          });
          await storage.createFamilyMember({
            userId: user.id,
            familyId: family.id,
            name: `${firstName || ""} ${lastName || ""}`.trim(),
            role: "parent",
            color: "#EC4899",
            avatar: (firstName || "U").charAt(0).toUpperCase(),
            notificationPreference: "sms",
            canLogin: true,
            isActive: true,
          });
          await storage.createFamilyMembership({
            userId: user.id,
            familyId: family.id,
            role: "owner",
          });
          // Admin signup SMS notifications disabled to reduce costs
        }
      }

      if (!user) return sendSuccessPage(!!state);

      req.session.userId = user.id;
      delete req.session.teenId;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });

      const token = generateToken(user.id);

      if (state) {
        // Native app flow: store token server-side keyed by state, then redirect back
        // to the native app using the appropriate deep-link scheme.
        // Android uses an intent URL to bypass Chrome Custom Tab / App Links issues.
        // iOS uses the momapp:// custom URL scheme registered in Info.plist.
        pendingGoogleTokens.set(state, { token, userId: user.id, createdAt: Date.now() });
        const ua = req.headers["user-agent"] || "";
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        if (isIOS) {
          // iOS: SFSafariViewController blocks direct 302 redirects to custom URL schemes.
          // Serve an HTML page that fires the URL scheme via JS — iOS handles this correctly.
          const iosUrl = `momapp://auth/google-return?state=${encodeURIComponent(state)}`;
          return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Signed in — The Mom App</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #fff5f8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center; }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h2 { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 8px; }
    p { font-size: 15px; color: #777; margin-bottom: 32px; line-height: 1.5; }
    .btn { display: inline-block; background: #ec4899; color: white; padding: 16px 32px; border-radius: 14px; text-decoration: none; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(236,72,153,0.35); }
  </style>
</head>
<body>
  <div class="icon">💗</div>
  <h2>You're signed in!</h2>
  <p>Returning you to The Mom App…</p>
  <a class="btn" href="${iosUrl}">← Open The Mom App</a>
  <script>
    setTimeout(function() { window.location.href = '${iosUrl}'; }, 400);
  </script>
</body>
</html>`);
        } else {
          // Android: use intent URL so Chrome opens the native app directly
          const fallbackUrl = `https://app.themom.app/auth/google/return?state=${encodeURIComponent(state)}`;
          const intentUrl = `intent://app.themom.app/auth/google/return?state=${encodeURIComponent(state)}#Intent;scheme=https;package=com.momapp.family;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
          return res.redirect(intentUrl);
        }
      }

      // Web/non-Android flow: redirect with token in URL
      res.redirect(`/?google_token=${encodeURIComponent(token)}`);
    } catch (error) {
      console.error("Google OAuth redirect callback error:", error);
      sendSuccessPage(!!state);
    }
  });

  // Native app polls this after resuming from Chrome OAuth flow
  app.get("/api/auth/google/poll", async (req, res) => {
    const state = req.query.state as string;
    if (!state) return res.status(400).json({ error: "state required" });
    const pending = pendingGoogleTokens.get(state);
    if (!pending) return res.json({ pending: true });
    // One-time use — delete immediately
    pendingGoogleTokens.delete(state);
    // Return user data alongside the token so the client can hydrate the
    // auth/user cache directly without a second round-trip, cutting sign-in latency.
    const user = await storage.getUserById(pending.userId);
    const userData = user ? {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      googleId: user.googleId,
      authMethod: user.authMethod,
    } : null;
    res.json({ token: pending.token, user: userData });
  });

  app.post("/api/auth/apple", async (req, res) => {
    try {
      const { identityToken, firstName, lastName } = req.body;
      if (!identityToken) return res.status(400).json({ error: "Apple identity token is required" });

      // Decode the JWT payload (Apple signs it — trusted from Apple's JS SDK popup flow)
      const parts = identityToken.split(".");
      if (parts.length < 2) return res.status(400).json({ error: "Invalid Apple token format" });
      const payload = JSON.parse(Buffer.from(parts[1] + "==", "base64").toString("utf8"));
      const { sub: appleId, email } = payload;

      if (!appleId) return res.status(400).json({ error: "Invalid Apple token payload" });

      let user = await storage.getUserByAppleId(appleId);

      if (!user && email) {
        user = await storage.getUserByEmail(email.toLowerCase());
        if (user) {
          await db.execute(sql`UPDATE users SET apple_id = ${appleId}, auth_method = 'apple', is_verified = true WHERE id = ${user.id}`);
          user = await storage.getUserById(user.id);
        }
      }

      if (!user) {
        if (!email) return res.status(400).json({ error: "Email required for new Apple Sign In users" });
        user = await storage.createUser({
          email: email.toLowerCase(),
          appleId,
          firstName: firstName || null,
          lastName: lastName || null,
          authMethod: "apple",
          isVerified: true,
        });

        const family = await storage.createFamily({ name: `${firstName || "My"}'s Family`, ownerId: user.id });
        await storage.createFamilyMember({
          userId: user.id, familyId: family.id,
          name: `${firstName || ""} ${lastName || ""}`.trim() || "Parent",
          role: "parent", color: "#EC4899",
          avatar: (firstName || "U").charAt(0).toUpperCase(),
          notificationPreference: "sms", canLogin: true, isActive: true,
        });
        await storage.createFamilyMembership({ userId: user.id, familyId: family.id, role: "owner" });

        // Admin signup SMS notifications disabled to reduce costs
      }

      if (!user) return res.status(500).json({ error: "Failed to create or find user" });

      req.session.userId = user.id;
      delete req.session.teenId;
      await new Promise<void>((resolve, reject) => { req.session.save((err) => { if (err) reject(err); else resolve(); }); });

      const token = generateToken(user.id);
      res.json({ success: true, token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, isVerified: user.isVerified } });
    } catch (error) {
      console.error("Apple auth error:", error);
      res.status(500).json({ error: "Apple authentication failed" });
    }
  });

  app.post("/api/auth/set-phone", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: "Phone number required" });
    try {
      await db.execute(sql`UPDATE users SET phone_number = ${phoneNumber} WHERE id = ${req.session.userId}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update phone number" });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      // Check JWT token authentication first (for cross-domain)
      const token = extractTokenFromRequest(req);
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          const user = await storage.getUserById(decoded.userId);
          if (user) {
            return res.json({
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phoneNumber: user.phoneNumber,
              profileImageUrl: user.profileImageUrl,
              authMethod: user.authMethod,
              isVerified: user.isVerified
            });
          }
        }
      }
      
      // Check traditional session-based authentication
      if (req.session.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          return res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
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
              phoneNumber: user.phoneNumber,
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

  // Update user profile
  app.put("/api/auth/profile", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { firstName, lastName } = req.body;
      
      // Validate input
      if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
        return res.status(400).json({ error: "First name is required" });
      }
      if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
        return res.status(400).json({ error: "Last name is required" });
      }
      
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user profile
      const updatedUser = await storage.updateUserProfile(req.session.userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      // Also update the corresponding family member display name
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (familyMember) {
        await storage.updateFamilyMember(familyMember.id, {
          name: `${firstName.trim()} ${lastName.trim()}`,
          avatar: firstName.trim().charAt(0).toUpperCase(),
        });
      }

      res.json({
        success: true,
        user: {
          id: updatedUser?.id,
          email: updatedUser?.email,
          firstName: updatedUser?.firstName,
          lastName: updatedUser?.lastName,
        }
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Change password for logged-in user
  app.put("/api/auth/password", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long" });
      }

      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash new password and update
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(req.session.userId, newPasswordHash);

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Delete account
  app.delete("/api/auth/account", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { confirmText } = req.body;
      
      if (confirmText !== "DELETE MY ACCOUNT") {
        return res.status(400).json({ error: "Please type 'DELETE MY ACCOUNT' to confirm" });
      }

      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Delete all user data
      await storage.deleteUserAccount(req.session.userId);

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
      });

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // User Preferences
  app.get("/api/auth/preferences", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const prefs = await storage.getUserPreferences(req.session.userId);
      
      // Return default preferences if none exist
      if (!prefs) {
        return res.json({
          marketingEmails: false,
          usageAnalytics: true,
          notificationMethod: "both",
          taskReminders: true,
          eventReminders: true,
          dailyDigest: true,
          dailyDigestTime: "09:00",
          timezone: null,
          taskReminderOnAssign: true,
          taskReminderBeforeDue: "2h",
          taskOverdueReminder: true,
          taskOverdueRepeatInterval: "4h",
          eventReminder1: "1d",
          eventReminder2: "1h",
          eventReminder3: "15m",
        });
      }

      res.json({
        marketingEmails: prefs.marketingEmails,
        usageAnalytics: prefs.usageAnalytics,
        notificationMethod: prefs.notificationMethod || "both",
        taskReminders: prefs.taskReminders ?? true,
        eventReminders: prefs.eventReminders ?? true,
        dailyDigest: prefs.dailyDigest ?? true,
        dailyDigestTime: prefs.dailyDigestTime || "09:00",
        timezone: prefs.timezone || null,
        taskReminderOnAssign: prefs.taskReminderOnAssign ?? true,
        taskReminderBeforeDue: prefs.taskReminderBeforeDue || "2h",
        taskOverdueReminder: prefs.taskOverdueReminder ?? true,
        taskOverdueRepeatInterval: prefs.taskOverdueRepeatInterval || "4h",
        eventReminder1: prefs.eventReminder1 || "1d",
        eventReminder2: prefs.eventReminder2 || "1h",
        eventReminder3: prefs.eventReminder3 || "15m",
      });
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  app.put("/api/auth/preferences", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { 
        marketingEmails, 
        usageAnalytics,
        notificationMethod,
        taskReminders,
        eventReminders,
        dailyDigest,
        dailyDigestTime,
        timezone,
        taskReminderOnAssign,
        taskReminderBeforeDue,
        taskOverdueReminder,
        taskOverdueRepeatInterval,
        eventReminder1,
        eventReminder2,
        eventReminder3,
      } = req.body;
      
      const updates: Record<string, any> = {};
      if (marketingEmails !== undefined) updates.marketingEmails = marketingEmails;
      if (usageAnalytics !== undefined) updates.usageAnalytics = usageAnalytics;
      if (notificationMethod !== undefined) updates.notificationMethod = notificationMethod;
      if (taskReminders !== undefined) updates.taskReminders = taskReminders;
      if (eventReminders !== undefined) updates.eventReminders = eventReminders;
      if (dailyDigest !== undefined) updates.dailyDigest = dailyDigest;
      if (dailyDigestTime !== undefined) updates.dailyDigestTime = dailyDigestTime;
      if (timezone !== undefined && timezone !== '') updates.timezone = timezone;
      if (taskReminderOnAssign !== undefined) updates.taskReminderOnAssign = taskReminderOnAssign;
      if (taskReminderBeforeDue !== undefined) updates.taskReminderBeforeDue = taskReminderBeforeDue;
      if (taskOverdueReminder !== undefined) updates.taskOverdueReminder = taskOverdueReminder;
      if (taskOverdueRepeatInterval !== undefined) updates.taskOverdueRepeatInterval = taskOverdueRepeatInterval;
      if (eventReminder1 !== undefined) updates.eventReminder1 = eventReminder1;
      if (eventReminder2 !== undefined) updates.eventReminder2 = eventReminder2;
      if (eventReminder3 !== undefined) updates.eventReminder3 = eventReminder3;

      const prefs = await storage.updateUserPreferences(req.session.userId, updates);

      res.json({
        success: true,
        preferences: {
          marketingEmails: prefs.marketingEmails,
          usageAnalytics: prefs.usageAnalytics,
          notificationMethod: prefs.notificationMethod,
          taskReminders: prefs.taskReminders,
          eventReminders: prefs.eventReminders,
          dailyDigest: prefs.dailyDigest,
          dailyDigestTime: prefs.dailyDigestTime,
          timezone: prefs.timezone || null,
          taskReminderOnAssign: prefs.taskReminderOnAssign,
          taskReminderBeforeDue: prefs.taskReminderBeforeDue,
          taskOverdueReminder: prefs.taskOverdueReminder,
          taskOverdueRepeatInterval: prefs.taskOverdueRepeatInterval,
          eventReminder1: prefs.eventReminder1,
          eventReminder2: prefs.eventReminder2,
          eventReminder3: prefs.eventReminder3,
        }
      });
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
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
      
      // Try token-based authentication for persistent mobile login
      const token = extractTokenFromRequest(req);
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          // Find teen profile by userId
          const teenProfile = await storage.getTeenProfileByUserId(decoded.userId);
          if (teenProfile) {
            // Restore the teen session
            req.session.teenId = teenProfile.id;
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

      const token = generateToken(teenProfile.userId);

      res.json({
        success: true,
        token,
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
      console.log("Login with invite code:", inviteCode);
      
      if (!inviteCode) {
        return res.status(400).json({ error: "Invite code is required" });
      }

      // Find and validate invite
      const invite = await storage.getFamilyInvite(inviteCode);
      console.log("Found invite:", invite);
      if (!invite || invite.status !== 'pending') {
        return res.status(401).json({ error: "Invalid or expired invite code" });
      }

      // Check if invite has expired (handle both Date and string formats)
      const expiresAt = typeof invite.expiresAt === 'string' ? new Date(invite.expiresAt) : invite.expiresAt;
      if (new Date() > expiresAt) {
        return res.status(401).json({ error: "Invite code has expired" });
      }

      // Check if teen already has an account
      const existingTeen = await storage.getTeenProfileByUserId(invite.acceptedBy || 0);
      
      if (existingTeen) {
        // Teen already set up, just log them in
        req.session.teenId = existingTeen.id;
        delete req.session.userId; // Clear parent session
        
        return req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ error: "Failed to save session" });
          }
          
          const inviteToken = generateToken(existingTeen.userId);
          return res.json({
            success: true,
            needsSetup: false,
            token: inviteToken,
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
        });
      }

      // New teen needs setup - get family name
      req.session.inviteCode = inviteCode;
      
      // Get family name directly
      const familyResult = await db.execute(sql`SELECT name FROM families WHERE id = ${invite.familyId}`);
      const familyName = familyResult.rows[0]?.name || 'Your Family';
      
      // Detect if this is a parent invite (teenName contains "Parent")
      const isParentInvite = invite.teenName?.toLowerCase().includes('parent');
      
      // Save session before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        
        res.json({
          success: true,
          needsSetup: true,
          isParentInvite,
          inviteData: {
            teenName: invite.teenName,
            familyId: invite.familyId,
            familyName,
            inviteCode
          }
        });
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

      // Check if this teen already exists by username
      const teenEmail = `${profile.username}@teen.local`;
      let existingUser = await storage.getUserByEmail(teenEmail);
      let user;
      let teenProfile;
      let familyMember;

      if (existingUser) {
        // Teen already exists - just log them in
        user = existingUser;
        
        // Find their teen profile
        const existingProfile = await storage.getTeenProfileByUserId(user.id);
        if (existingProfile) {
          teenProfile = existingProfile;
          
          // Set session and respond
          req.session.teenId = teenProfile.id;
          delete req.session.userId;
          delete req.session.inviteCode;
          
          // Save session explicitly before responding
          return req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              return res.status(500).json({ error: "Failed to save session" });
            }
            
            return res.json({
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
          });
        }
      }

      // Create new user account
      const passwordHash = await bcrypt.hash(profile.password, 10);
      user = await storage.createUser({
        email: teenEmail,
        passwordHash,
        firstName: profile.firstName,
        lastName: profile.lastName
      });

      // Create family member record
      familyMember = await storage.createFamilyMember({
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
      teenProfile = await storage.createTeenProfile({
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

      // Save session explicitly before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        
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

  // Create teen invite (called from parent dashboard)
  app.post("/api/teens/invite", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { name, phone, email, preferredContact } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Teen name is required" });
      }

      // Get parent's family
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const parentFamilyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!parentFamilyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Check family member limit (max 6 members with login accounts - children are unlimited)
      const familyMembers = await storage.getFamilyMembersByFamily(familyMembership.familyId);
      const membersWithLogin = familyMembers.filter(m => m.isActive && m.role !== 'child');
      if (membersWithLogin.length >= 6) {
        return res.status(403).json({ 
          error: "Family member limit reached", 
          message: "Your plan allows up to 6 members with login accounts. Child accounts are unlimited." 
        });
      }

      // Generate unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create family invite record
      const invite = await storage.createFamilyInvite({
        inviteCode,
        familyId: familyMembership.familyId,
        teenName: name,
        invitedBy: req.session.userId,
        expiresAt,
        status: "pending"
      });

      // Create a placeholder family member for the teen
      const teenFamilyMember = await storage.createFamilyMember({
        name,
        role: "teen",
        color: "#8B5CF6",
        avatar: name.charAt(0).toUpperCase(),
        userId: null,
        familyId: familyMembership.familyId,
        canLogin: false,
        isActive: false,
        phone: phone || null,
        email: email || null
      });

      // Attempt to send invite via SMS or email
      let inviteResult = { success: false, method: preferredContact, error: "" };
      const appUrl = "https://themom.app";

      if (preferredContact === "sms" && phone) {
        try {
          const message = `You've been invited to join your family on The Mom App! Your invite code is: ${inviteCode}. Download the app and enter this code to get started: ${appUrl}`;
          const smsSuccess = await sendSMS(phone, message);
          if (smsSuccess) {
            inviteResult = { success: true, method: "sms", error: "" };
          } else {
            inviteResult = { success: false, method: "sms", error: "SMS service not configured or unavailable" };
          }
        } catch (smsError: any) {
          console.error("SMS send error:", smsError);
          inviteResult = { success: false, method: "sms", error: smsError.message || "Failed to send SMS" };
        }
      } else if (preferredContact === "email" && email) {
        try {
          await emailService.sendEmail(
            email,
            "You're invited to The Mom App!",
            createBrandedEmailTemplate(`
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:700;">You're Invited!</h2>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                You've been invited to join your family on The Mom App — the all-in-one family coordination app. Your invite code is:
              </p>
              <div style="text-align:center;margin:24px 0;">
                <span style="background:#fdf4fb;border:2px dashed #EC4899;color:#EC4899;font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 32px;border-radius:8px;display:inline-block;">${inviteCode}</span>
              </div>
              <div style="text-align:center;margin:32px 0;">
                <a href="${appUrl}" style="background:linear-gradient(135deg,#EC4899,#A855F7);color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">Get Started</a>
              </div>
              <p style="margin:24px 0 0;color:#888;font-size:13px;text-align:center;">Download The Mom App and enter your invite code to join your family.</p>
            `)
          );
          inviteResult = { success: true, method: "email", error: "" };
        } catch (emailError: any) {
          console.error("Email send error:", emailError);
          inviteResult = { success: false, method: "email", error: emailError.message || "Failed to send email" };
        }
      }

      res.json({
        success: true,
        teen: {
          id: teenFamilyMember.id,
          name: teenFamilyMember.name,
          inviteCode: inviteCode
        },
        invite: inviteResult
      });
    } catch (error) {
      console.error("Teen invite error:", error);
      res.status(500).json({ error: "Failed to create teen invite" });
    }
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

      // Get the task to check points before updating
      const task = await storage.getTask(taskId);
      
      const updatedTask = await storage.updateTask(taskId, { 
        isCompleted: completed,
        completedAt: completed ? new Date() : null,
        completedBy: completed ? teenProfile.familyMemberId : null // Use family member ID, not teen ID
      });

      // If task was just completed, add points to the family member
      if (completed && task && task.points && !task.isCompleted) {
        await storage.addPointsToFamilyMember(teenProfile.familyMemberId, task.points);
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Teen task update error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Teen clear all tasks endpoint - deletes all tasks assigned to teen
  // MUST be before :taskId route to prevent "clear-all" from being matched as a taskId
  app.delete("/api/teen/tasks/clear-all", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the teen's profile and family member info
      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      // Get family member to access familyId
      const familyMember = await storage.getFamilyMember(teenProfile.familyMemberId!);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get all tasks for this teen (assigned to them)
      const allTasks = await storage.getTasks(familyMember.familyId);
      const teenTasks = allTasks.filter(task => task.assignedTo === teenProfile.familyMemberId);

      // Delete each task
      for (const task of teenTasks) {
        await storage.deleteTask(task.id);
      }

      res.json({ success: true, deletedCount: teenTasks.length });
    } catch (error) {
      console.error("Teen clear all tasks error:", error);
      res.status(500).json({ error: "Failed to clear tasks" });
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

  // Teen stats endpoint - returns points and streak information
  app.get("/api/teen/stats", async (req, res) => {
    try {
      if (!req.session.teenId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const teenProfile = await storage.getTeenProfile(req.session.teenId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      // Get the family member to access points
      const familyMember = await storage.getFamilyMember(teenProfile.familyMemberId);
      const totalPoints = familyMember?.points || 0;

      // Calculate weekly points from completed tasks this week
      const tasks = await storage.getTasksByFamilyMember(teenProfile.familyMemberId);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const weeklyPoints = tasks
        .filter(task => task.isCompleted && task.completedAt && new Date(task.completedAt) >= oneWeekAgo)
        .reduce((sum, task) => sum + (task.points || 0), 0);

      // Calculate streak (consecutive days with completed tasks)
      const completedDates = tasks
        .filter(task => task.isCompleted && task.completedAt)
        .map(task => new Date(task.completedAt!).toDateString())
        .filter((date, index, self) => self.indexOf(date) === index)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      let streak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      // Check if there's activity today or yesterday to start the streak
      if (completedDates.includes(today) || completedDates.includes(yesterday)) {
        let currentDate = completedDates.includes(today) ? new Date() : new Date(Date.now() - 86400000);
        
        for (const dateStr of completedDates) {
          if (new Date(dateStr).toDateString() === currentDate.toDateString()) {
            streak++;
            currentDate = new Date(currentDate.getTime() - 86400000);
          } else {
            break;
          }
        }
      }

      res.json({
        totalPoints,
        weeklyPoints,
        streak
      });
    } catch (error) {
      console.error("Teen stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
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

  // Teen family info endpoint - returns family name and member count
  app.get("/api/teen/family-info", async (req, res) => {
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

      // Get family info directly from database
      const familyResult = await db.execute(sql`SELECT id, name FROM families WHERE id = ${familyMember.familyId}`);
      const family = familyResult.rows[0];
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get family members count
      const familyMembers = await storage.getFamilyMembersByFamily(familyMember.familyId);
      const activeMemberCount = familyMembers.filter(m => m.isActive).length;

      res.json({
        familyId: family.id,
        familyName: family.name,
        memberCount: activeMemberCount
      });
    } catch (error) {
      console.error("Teen family info error:", error);
      res.status(500).json({ error: "Failed to get family info" });
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

  // Parent Teen Point Management Endpoints
  // Get teen points data (for parent dashboard) - uses family member ID
  app.get("/api/teen/points/:familyMemberId", async (req, res) => {
    try {
      // Check JWT token authentication first (for mobile/cross-domain)
      let userId = req.session.userId;
      const token = extractTokenFromRequest(req);
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId;
        }
      }
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMemberId = parseInt(req.params.familyMemberId);
      
      // Get the family member first
      const teenFamilyMember = await storage.getFamilyMemberById(familyMemberId);
      if (!teenFamilyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Verify parent has access to this teen (same family)
      const parentMembership = await storage.getUserFamilyMembership(userId);
      if (!parentMembership || parentMembership.familyId !== teenFamilyMember.familyId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get the teen profile by family member ID
      const teenProfile = await storage.getTeenProfileByFamilyMemberId(familyMemberId);
      
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      res.json({
        teenId: teenProfile.id,
        name: teenFamilyMember.name,
        username: teenProfile.username,
        points: teenProfile.points || 0,
        streak: teenProfile.streak || 0,
        lastActivity: teenProfile.lastLogin || new Date().toISOString()
      });
    } catch (error) {
      console.error("Get teen points error:", error);
      res.status(500).json({ error: "Failed to get teen points" });
    }
  });

  // Deduct points from teen (for parents when redeeming rewards) - uses family member ID
  app.post("/api/teen/points/:familyMemberId/deduct", async (req, res) => {
    try {
      // Check JWT token authentication first (for mobile/cross-domain)
      let userId = req.session.userId;
      const token = extractTokenFromRequest(req);
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId;
        }
      }
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMemberId = parseInt(req.params.familyMemberId);
      const { amount, reason } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Get the family member first
      const teenFamilyMember = await storage.getFamilyMemberById(familyMemberId);
      if (!teenFamilyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Verify parent has access to this teen (same family)
      const parentMembership = await storage.getUserFamilyMembership(userId);
      if (!parentMembership || parentMembership.familyId !== teenFamilyMember.familyId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get teen profile by family member ID
      const teenProfile = await storage.getTeenProfileByFamilyMemberId(familyMemberId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const currentPoints = teenProfile.points || 0;
      const deductAmount = Math.min(amount, currentPoints); // Can't deduct more than they have
      const newPoints = currentPoints - deductAmount;

      await storage.updateTeenProfile(teenProfile.id, { points: newPoints });

      console.log(`Parent deducted ${deductAmount} points from teen ${teenProfile.id}. Reason: ${reason || 'Not specified'}`);

      res.json({
        success: true,
        previousPoints: currentPoints,
        deducted: deductAmount,
        newPoints: newPoints
      });
    } catch (error) {
      console.error("Deduct teen points error:", error);
      res.status(500).json({ error: "Failed to deduct points" });
    }
  });

  // Reset teen points to zero (for parents) - uses family member ID
  app.post("/api/teen/points/:familyMemberId/reset", async (req, res) => {
    try {
      // Check JWT token authentication first (for mobile/cross-domain)
      let userId = req.session.userId;
      const token = extractTokenFromRequest(req);
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId;
        }
      }
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMemberId = parseInt(req.params.familyMemberId);
      const { reason } = req.body;

      // Get the family member first
      const teenFamilyMember = await storage.getFamilyMemberById(familyMemberId);
      if (!teenFamilyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Verify parent has access to this teen (same family)
      const parentMembership = await storage.getUserFamilyMembership(userId);
      if (!parentMembership || parentMembership.familyId !== teenFamilyMember.familyId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get teen profile by family member ID
      const teenProfile = await storage.getTeenProfileByFamilyMemberId(familyMemberId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      const previousPoints = teenProfile.points || 0;
      await storage.updateTeenProfile(teenProfile.id, { points: 0 });

      console.log(`Parent reset teen ${teenProfile.id} points from ${previousPoints} to 0. Reason: ${reason || 'Not specified'}`);

      res.json({
        success: true,
        previousPoints: previousPoints,
        newPoints: 0
      });
    } catch (error) {
      console.error("Reset teen points error:", error);
      res.status(500).json({ error: "Failed to reset points" });
    }
  });

  // ============== FAMILY POINTS SYSTEM (for all kids - child and teen roles) ==============
  
  // Get all kids with their points for a family
  app.get("/api/family-points", async (req, res) => {
    try {
      let userId = req.session.userId;
      const token = extractTokenFromRequest(req);
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) userId = decoded.userId;
      }
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const membership = await storage.getUserFamilyMembership(userId);
      if (!membership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const kids = await storage.getKidsWithPoints(membership.familyId);
      res.json(kids);
    } catch (error) {
      console.error("Get family points error:", error);
      res.status(500).json({ error: "Failed to get family points" });
    }
  });

  // Add points to a kid
  app.post("/api/family-points/:familyMemberId/add", async (req, res) => {
    try {
      let userId = req.session.userId;
      const token = extractTokenFromRequest(req);
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) userId = decoded.userId;
      }
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMemberId = parseInt(req.params.familyMemberId);
      const { amount } = req.body;

      // Validate amount is a positive integer
      const parsedAmount = parseInt(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10000) {
        return res.status(400).json({ error: "Invalid amount. Must be a positive number up to 10000." });
      }

      const member = await storage.getFamilyMemberById(familyMemberId);
      if (!member) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Verify target is a child or teen
      if (member.role !== 'child' && member.role !== 'teen') {
        return res.status(400).json({ error: "Can only manage points for children and teens" });
      }

      // Verify caller is in the same family
      const callerMembership = await storage.getUserFamilyMembership(userId);
      if (!callerMembership || callerMembership.familyId !== member.familyId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify caller is a parent (mom, dad, or parent role)
      const callerFamilyMembers = await storage.getFamilyMembersByFamilyId(callerMembership.familyId);
      const callerMember = callerFamilyMembers.find(m => m.userId === userId);
      if (!callerMember || !['mom', 'dad', 'parent'].includes(callerMember.role)) {
        return res.status(403).json({ error: "Only parents can manage kids' points" });
      }

      const updated = await storage.addKidPoints(familyMemberId, parsedAmount);
      res.json({ success: true, member: updated });
    } catch (error) {
      console.error("Add kid points error:", error);
      res.status(500).json({ error: "Failed to add points" });
    }
  });

  // Deduct points from a kid
  app.post("/api/family-points/:familyMemberId/deduct", async (req, res) => {
    try {
      let userId = req.session.userId;
      const token = extractTokenFromRequest(req);
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) userId = decoded.userId;
      }
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMemberId = parseInt(req.params.familyMemberId);
      const { amount } = req.body;

      // Validate amount is a positive integer
      const parsedAmount = parseInt(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10000) {
        return res.status(400).json({ error: "Invalid amount. Must be a positive number up to 10000." });
      }

      const member = await storage.getFamilyMemberById(familyMemberId);
      if (!member) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Verify target is a child or teen
      if (member.role !== 'child' && member.role !== 'teen') {
        return res.status(400).json({ error: "Can only manage points for children and teens" });
      }

      // Verify caller is in the same family
      const callerMembership = await storage.getUserFamilyMembership(userId);
      if (!callerMembership || callerMembership.familyId !== member.familyId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify caller is a parent (mom, dad, or parent role)
      const callerFamilyMembers = await storage.getFamilyMembersByFamilyId(callerMembership.familyId);
      const callerMember = callerFamilyMembers.find(m => m.userId === userId);
      if (!callerMember || !['mom', 'dad', 'parent'].includes(callerMember.role)) {
        return res.status(403).json({ error: "Only parents can manage kids' points" });
      }

      const updated = await storage.deductKidPoints(familyMemberId, parsedAmount);
      res.json({ success: true, member: updated });
    } catch (error) {
      console.error("Deduct kid points error:", error);
      res.status(500).json({ error: "Failed to deduct points" });
    }
  });

  // Reset a kid's points to zero
  app.post("/api/family-points/:familyMemberId/reset", async (req, res) => {
    try {
      let userId = req.session.userId;
      const token = extractTokenFromRequest(req);
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) userId = decoded.userId;
      }
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMemberId = parseInt(req.params.familyMemberId);

      const member = await storage.getFamilyMemberById(familyMemberId);
      if (!member) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Verify target is a child or teen
      if (member.role !== 'child' && member.role !== 'teen') {
        return res.status(400).json({ error: "Can only reset points for children and teens" });
      }

      // Verify caller is in the same family
      const callerMembership = await storage.getUserFamilyMembership(userId);
      if (!callerMembership || callerMembership.familyId !== member.familyId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify caller is a parent (mom, dad, or parent role)
      const callerFamilyMembers = await storage.getFamilyMembersByFamilyId(callerMembership.familyId);
      const callerMember = callerFamilyMembers.find(m => m.userId === userId);
      if (!callerMember || !['mom', 'dad', 'parent'].includes(callerMember.role)) {
        return res.status(403).json({ error: "Only parents can manage kids' points" });
      }

      const previousPoints = member.points || 0;
      const updated = await storage.resetKidPoints(familyMemberId);
      
      res.json({ 
        success: true, 
        member: updated,
        previousPoints
      });
    } catch (error) {
      console.error("Reset kid points error:", error);
      res.status(500).json({ error: "Failed to reset points" });
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

  // Feedback Prompt Endpoints
  app.get("/api/feedback-prompt/check", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.json({ shouldShow: false });
      }

      const shouldShow = await storage.shouldShowFeedbackPrompt(req.session.userId);
      res.json({ shouldShow });
    } catch (error) {
      console.error("Feedback prompt check error:", error);
      res.json({ shouldShow: false });
    }
  });

  app.post("/api/feedback-prompt/respond", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { response, feedbackText, reviewRequested, remindLater } = req.body;
      
      const prompt = await storage.updateFeedbackPromptResponse(
        req.session.userId,
        response,
        feedbackText,
        reviewRequested,
        remindLater
      );

      res.json({ success: true, prompt });
    } catch (error) {
      console.error("Feedback prompt respond error:", error);
      res.status(500).json({ error: "Failed to save feedback" });
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

      // Get current user's family member ID for privacy filtering
      const userFamilyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      const currentMemberId = userFamilyMember?.id;

      // Get pending tasks for the family (filtered for private tasks)
      const pendingTasks = await storage.getPendingTasksByFamily(familyMembership.familyId, currentMemberId);
      
      // Get "My Tasks" - tasks assigned to the current user
      const myTasks = currentMemberId 
        ? pendingTasks.filter(task => task.assignedTo === currentMemberId) 
        : [];
      
      // Get events for today
      const todayEvents = await storage.getTodayEventsByFamily(familyMembership.familyId);

      res.json({
        pendingTasks: pendingTasks.length,
        myTasks: myTasks.length,
        todayEvents: todayEvents.length,
        familyMembers: await storage.getFamilyMembersByFamily(familyMembership.familyId)
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  // Get teen profiles for the family (for parents to see kids' points)
  app.get("/api/teen-profiles", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.json([]);
      }

      // Get all family members for this family who are teens
      const familyMembers = await storage.getFamilyMembersByFamily(familyMembership.familyId);
      const teenMembers = familyMembers.filter(m => m.role === 'teen');

      // Get teen profiles for each teen member
      const teens = await Promise.all(
        teenMembers.map(async (member) => {
          if (member.userId) {
            const profile = await storage.getTeenProfileByUserId(member.userId);
            return profile;
          }
          return null;
        })
      );

      res.json(teens.filter(Boolean));
    } catch (error) {
      console.error("Get teen profiles error:", error);
      res.status(500).json({ error: "Failed to get teen profiles" });
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

      // Get current user's family member ID for privacy filtering
      const userFamilyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      const currentMemberId = userFamilyMember?.id;

      const pendingTasks = await storage.getPendingTasksByFamily(familyMembership.familyId, currentMemberId);
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

      // Get current user's family member ID for privacy filtering
      const userFamilyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      const currentMemberId = userFamilyMember?.id;

      const tasks = await storage.getTasksByFamily(familyMembership.familyId, currentMemberId);
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

      const { title, description, dueDate, priority, assignedTo, category, points, estimatedTime, childProfileId, isPrivate } = req.body;

      // Check if user is on Individual plan - cannot assign tasks to others
      const onIndividualPlan = await isUserOnIndividualPlan(req.session.userId);
      
      // Check if assignedTo is a family member with a child profile
      let finalAssignedTo = onIndividualPlan ? null : (assignedTo || null);
      let finalChildProfileId = onIndividualPlan ? null : (childProfileId || null);

      if (assignedTo && !childProfileId && !onIndividualPlan) {
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
        childProfileId: finalChildProfileId,
        isPrivate: isPrivate || false
      });

      // Schedule task notifications if assignee has reminders enabled and task has due date
      if (task.dueDate && (finalAssignedTo || finalChildProfileId)) {
        try {
          if (finalAssignedTo) {
            // Parent/family member assignment - get their user ID
            const assigneeMember = await storage.getFamilyMember(finalAssignedTo);
            if (assigneeMember?.userId) {
              const prefs = await storage.getUserPreferences(assigneeMember.userId);
              if (prefs?.taskReminders !== false) {
                await notificationService.scheduleParentTaskNotifications({
                  taskId: task.id,
                  userId: assigneeMember.userId,
                  taskTitle: task.title,
                  dueDate: new Date(task.dueDate),
                });
              }
            }
          } else if (finalChildProfileId) {
            // Teen/child profile assignment - use teen notification system
            await notificationService.scheduleTaskNotifications({
              taskId: task.id,
              teenId: finalChildProfileId,
              taskTitle: task.title,
              dueDate: new Date(task.dueDate),
              points: task.points || 0,
            });
          }
        } catch (notifError) {
          console.error("Failed to schedule task notifications:", notifError);
          // Don't fail task creation if notification scheduling fails
        }
      }

      res.json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Parent task update endpoint
  app.patch("/api/tasks/:taskId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const taskId = parseInt(req.params.taskId);
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get the task to verify it exists
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Update the task
      const { title, description, priority, assignedTo, dueDate, points } = req.body;
      const updates: any = {};
      
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (priority !== undefined) updates.priority = priority;
      if (assignedTo !== undefined) updates.assignedTo = assignedTo;
      if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
      if (points !== undefined) updates.points = points;

      const updatedTask = await storage.updateTask(taskId, updates);
      res.json(updatedTask);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Parent task completion endpoint
  app.patch("/api/tasks/:taskId/complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const taskId = parseInt(req.params.taskId);
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get the current user's family member record
      const currentMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!currentMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get the task to verify it exists
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Mark task as completed
      const completedTask = await storage.completeTask(taskId, currentMember.id);
      
      // Cancel any pending notifications for this task
      try {
        await notificationService.markTaskCompleted(taskId);
      } catch (notifError) {
        console.error("Failed to cancel task notifications:", notifError);
      }

      // Auto-spawn next occurrence for recurring tasks
      if (task.recurrence && task.recurrence !== "none" && task.dueDate) {
        try {
          const nextDue = new Date(task.dueDate);
          if (task.recurrence === "daily") nextDue.setDate(nextDue.getDate() + 1);
          else if (task.recurrence === "weekly") nextDue.setDate(nextDue.getDate() + 7);
          else if (task.recurrence === "monthly") nextDue.setMonth(nextDue.getMonth() + 1);
          else if (task.recurrence === "yearly") nextDue.setFullYear(nextDue.getFullYear() + 1);

          const shouldSpawn = !task.recurrenceEndDate || nextDue <= new Date(task.recurrenceEndDate);
          if (shouldSpawn) {
            await storage.createTask({
              title: task.title,
              description: task.description,
              priority: task.priority,
              assignedTo: task.assignedTo,
              dueDate: nextDue.toISOString(),
              points: task.points,
              isPrivate: task.isPrivate,
              recurrence: task.recurrence,
              recurrenceEndDate: task.recurrenceEndDate ? task.recurrenceEndDate.toISOString() : null,
              childProfileId: task.childProfileId,
              createdBy: task.createdBy,
              category: task.category,
              estimatedTime: task.estimatedTime,
            });
          }
        } catch (recurErr) {
          console.error("Failed to spawn next recurring task:", recurErr);
        }
      }
      
      res.json(completedTask);
    } catch (error) {
      console.error("Complete task error:", error);
      res.status(500).json({ error: "Failed to complete task" });
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
      
      // Cancel any pending notifications for this task
      try {
        await notificationService.cancelTaskNotifications(taskId);
      } catch (notifError) {
        console.error("Failed to cancel task notifications:", notifError);
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

      // Get the current family member record
      const currentMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!currentMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      // Get scope from request body (default to 'self' for safety)
      const { scope = 'self' } = req.body as { scope?: 'self' | 'teens' | 'children' | 'all' | 'completed' };

      // Delete tasks based on scope
      await storage.deleteTasksByScope(currentMember.id, familyMembership.familyId, scope);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete all tasks error:", error);
      res.status(500).json({ error: "Failed to delete all tasks" });
    }
  });

  // Get family info
  app.get("/api/family", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const family = await storage.getFamilyByUserId(req.session.userId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      res.json(family);
    } catch (error) {
      console.error("Get family error:", error);
      res.status(500).json({ error: "Failed to get family" });
    }
  });

  // Update family name
  app.patch("/api/family", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Family name is required" });
      }

      const family = await storage.getFamilyByUserId(req.session.userId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      const updated = await storage.updateFamily(family.id, { name: name.trim() });
      res.json(updated);
    } catch (error) {
      console.error("Update family error:", error);
      res.status(500).json({ error: "Failed to update family" });
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

  // Parent invite via SMS
  app.post("/api/family/invite-parent", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { phone, role } = req.body;

      if (!phone || !role) {
        return res.status(400).json({ error: "Phone number and role are required" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const family = await storage.getFamilyByUserId(req.session.userId);
      const user = await storage.getUserById(req.session.userId);

      // Generate invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      // Store invite using direct SQL since schema differs from DB
      await db.execute(sql`
        INSERT INTO family_invites (code, family_id, teen_name, invited_by, expires_at, status)
        VALUES (${inviteCode}, ${familyMembership.familyId}, ${`Parent (${role})`}, ${req.session.userId}, ${expiresAt}, 'pending')
      `);

      // Send SMS
      const inviterName = user?.firstName || 'A family member';
      const familyName = family?.name || 'the family';
      const message = `${inviterName} has invited you to join ${familyName} on The Mom App! Your invite code is: ${inviteCode}. Download the app and use this code to join: https://themom.app`;
      
      const smsSent = await sendSMS(phone, message);

      res.json({
        success: true,
        inviteCode,
        invitedPhone: phone,
        role,
        smsSent
      });
    } catch (error) {
      console.error("Parent invite error:", error);
      res.status(500).json({ error: "Failed to send parent invitation" });
    }
  });

  // Family Merge Endpoints
  app.post("/api/family/merge", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { partnerEmail } = req.body;
      if (!partnerEmail) {
        return res.status(400).json({ error: "Partner email is required" });
      }

      const result = await storage.createFamilyMergeRequest(partnerEmail, req.session.userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json(result);
    } catch (error) {
      console.error("Error creating merge request:", error);
      res.status(500).json({ error: "Failed to create merge request" });
    }
  });

  app.get("/api/family/merge-requests", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const requests = await storage.getFamilyMergeRequestsForUser(user.email);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching merge requests:", error);
      res.status(500).json({ error: "Failed to fetch merge requests" });
    }
  });

  app.post("/api/family/merge-requests/:requestId/approve", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const requestId = parseInt(req.params.requestId);
      const { billingPreference } = req.body;

      const result = await storage.approveFamilyMergeRequest(requestId, req.session.userId, {
        billingStrategy: billingPreference || 'keep_mine',
        primaryBiller: req.session.userId
      });

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json({ ...result, currentUserId: req.session.userId });
    } catch (error) {
      console.error("Error approving merge request:", error);
      res.status(500).json({ error: "Failed to approve merge request" });
    }
  });

  app.post("/api/family/merge-requests/:requestId/reject", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const requestId = parseInt(req.params.requestId);
      const result = await storage.rejectFamilyMergeRequest(requestId);

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json(result);
    } catch (error) {
      console.error("Error rejecting merge request:", error);
      res.status(500).json({ error: "Failed to reject merge request" });
    }
  });

  app.post("/api/family-members", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user is on Individual plan - cannot add family members
      if (await isUserOnIndividualPlan(req.session.userId)) {
        return res.status(403).json({ 
          error: "Family Plan Required", 
          message: "Adding family members requires a Family Plan subscription." 
        });
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

  app.patch("/api/family-members/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const memberId = parseInt(req.params.id);
      if (isNaN(memberId)) {
        return res.status(400).json({ error: "Invalid member ID" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const existingMember = await storage.getFamilyMember(memberId);
      if (!existingMember || existingMember.familyId !== familyMembership.familyId) {
        return res.status(404).json({ error: "Family member not found" });
      }

      const { name, role, color, avatar, phone, email, notificationPreference } = req.body;

      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (role !== undefined) updates.role = role;
      if (color !== undefined) updates.color = color;
      if (avatar !== undefined) updates.avatar = avatar;
      if (phone !== undefined) updates.phone = phone;
      if (email !== undefined) updates.email = email;
      if (notificationPreference !== undefined) updates.notificationPreference = notificationPreference;

      if (name && !avatar) {
        updates.avatar = name.trim().charAt(0).toUpperCase();
      }

      const updatedMember = await storage.updateFamilyMember(memberId, updates);

      if (existingMember.userId && name) {
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        await storage.updateUserProfile(existingMember.userId, { firstName, lastName });
      }

      res.json(updatedMember);
    } catch (error) {
      console.error("Family member update error:", error);
      res.status(500).json({ error: "Failed to update family member" });
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

  app.patch("/api/meal-plans/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const mealId = parseInt(req.params.id);
      const { day, mealType, meal, ingredients, notes, prepTime } = req.body;
      
      const updated = await storage.updateMealPlan(mealId, {
        day,
        mealType,
        meal,
        ingredients,
        notes,
        prepTime,
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Meal plan not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update meal plan error:", error);
      res.status(500).json({ error: "Failed to update meal plan" });
    }
  });

  app.delete("/api/meal-plans/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const mealId = parseInt(req.params.id);
      const success = await storage.deleteMealPlan(mealId);
      
      if (!success) {
        return res.status(404).json({ error: "Meal plan not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete meal plan error:", error);
      res.status(500).json({ error: "Failed to delete meal plan" });
    }
  });

  // Clear all meal plans for the week
  app.delete("/api/meal-plans", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const count = await storage.deleteAllMealPlans();
      res.json({ success: true, deleted: count });
    } catch (error) {
      console.error("Clear all meal plans error:", error);
      res.status(500).json({ error: "Failed to clear meal plans" });
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

  app.patch("/api/grocery-items/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const itemId = parseInt(req.params.id);
      const updated = await storage.updateGroceryItem(itemId, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Grocery item not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update grocery item error:", error);
      res.status(500).json({ error: "Failed to update grocery item" });
    }
  });

  app.delete("/api/grocery-items/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const itemId = parseInt(req.params.id);
      const success = await storage.deleteGroceryItem(itemId);
      
      if (!success) {
        return res.status(404).json({ error: "Grocery item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete grocery item error:", error);
      res.status(500).json({ error: "Failed to delete grocery item" });
    }
  });

  app.delete("/api/grocery-items", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      await storage.deleteAllGroceryItems(familyMembership.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete all grocery items error:", error);
      res.status(500).json({ error: "Failed to delete all grocery items" });
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

      // Check if user is on Individual plan - force private visibility
      const onIndividualPlan = await isUserOnIndividualPlan(req.session.userId);
      const finalVisibilityType = onIndividualPlan ? "private" : (visibilityType || "shared");
      const finalSharedWith = onIndividualPlan ? [] : (sharedWith || []);
      const finalIsPrivate = onIndividualPlan ? true : (isPrivate || false);

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
        isPrivate: finalIsPrivate,
        visibilityType: finalVisibilityType,
        sharedWith: finalSharedWith,
        createdBy: userFamilyMember.id
      };

      const newEvent = await storage.createEvent(eventData);
      
      // Schedule event reminders for the creator
      try {
        const prefs = await storage.getUserPreferences(req.session.userId);
        if (prefs?.eventReminders !== false) {
          await notificationService.scheduleEventReminders({
            eventId: newEvent.id,
            userId: req.session.userId,
            eventTitle: newEvent.title,
            startTime: new Date(newEvent.startTime),
            location: newEvent.location || undefined,
          });
        }
        
        // Also schedule reminders for assigned family members
        if (assignedTo && assignedTo.length > 0) {
          for (const memberId of assignedTo) {
            const member = await storage.getFamilyMember(memberId);
            if (member?.userId && member.userId !== req.session.userId) {
              const memberPrefs = await storage.getUserPreferences(member.userId);
              if (memberPrefs?.eventReminders !== false) {
                await notificationService.scheduleEventReminders({
                  eventId: newEvent.id,
                  userId: member.userId,
                  eventTitle: newEvent.title,
                  startTime: new Date(newEvent.startTime),
                  location: newEvent.location || undefined,
                });
              }
            }
          }
        }
      } catch (notifError) {
        console.error("Failed to schedule event reminders:", notifError);
      }
      
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

      // Get the family_members record so we have the correct ID that events reference
      const currentFamilyMember = await storage.getFamilyMemberByUserId(req.session.userId);

      const events = await storage.getEventsByFamily(familyMembership.familyId);

      // Filter out private events that belong to other family members
      const visibleEvents = events.filter(event => {
        if (event.visibilityType === 'private' || event.isPrivate) {
          return currentFamilyMember && event.createdBy === currentFamilyMember.id;
        }
        return true;
      });

      res.json(visibleEvents);
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
      
      // Cancel any pending event reminders
      try {
        await notificationService.cancelEventReminders(eventId);
      } catch (notifError) {
        console.error("Failed to cancel event reminders:", notifError);
      }
      
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

      // Get the family_members record so we have the correct ID that events reference
      const currentFamilyMember = await storage.getFamilyMemberByUserId(req.session.userId);

      const todayEvents = await storage.getTodayEventsByFamily(familyMembership.familyId);

      // Filter out private events that belong to other family members
      const visibleEvents = todayEvents.filter(event => {
        if (event.visibilityType === 'private' || event.isPrivate) {
          return currentFamilyMember && event.createdBy === currentFamilyMember.id;
        }
        return true;
      });

      res.json(visibleEvents);
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

      const passwords = await storage.getPasswordsByFamily(familyMembership.familyId);
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

  // Update password details
  app.patch("/api/passwords/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const passwordId = parseInt(req.params.id);
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      const existingPassword = await storage.getPasswordById(passwordId);
      if (!existingPassword) {
        return res.status(404).json({ error: "Password not found" });
      }

      if (existingPassword.createdBy !== familyMember.id) {
        return res.status(403).json({ error: "You can only edit passwords you created" });
      }

      const { title, category, website, username, email, password, notes, isFavorite } = req.body;
      const updates: Record<string, any> = {};
      if (title !== undefined) updates.title = title;
      if (category !== undefined) updates.category = category;
      if (website !== undefined) updates.website = website;
      if (username !== undefined) updates.username = username;
      if (email !== undefined) updates.email = email;
      if (password !== undefined) updates.password = password;
      if (notes !== undefined) updates.notes = notes;
      if (isFavorite !== undefined) updates.isFavorite = isFavorite;

      const updated = await storage.updatePassword(passwordId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({ error: "Failed to update password" });
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

  app.get("/api/voice-notes/all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const allVoiceNotes = await storage.getVoiceNotesByFamily(familyMembership.familyId);
      res.json(allVoiceNotes);
    } catch (error) {
      console.error("All voice notes fetch error:", error);
      res.status(500).json({ error: "Failed to fetch voice notes" });
    }
  });

  app.delete("/api/voice-notes/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: "Invalid note ID" });
      }

      const success = await storage.deleteVoiceNote(noteId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete voice note" });
      }
    } catch (error) {
      console.error("Voice note deletion error:", error);
      res.status(500).json({ error: "Failed to delete voice note" });
    }
  });

  app.delete("/api/voice-notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      const deletedCount = await storage.deleteAllVoiceNotesByFamily(familyMembership.familyId);
      res.json({ success: true, deletedCount });
    } catch (error) {
      console.error("Delete all voice notes error:", error);
      res.status(500).json({ error: "Failed to delete all voice notes" });
    }
  });

  // Text Notes Endpoints
  app.get("/api/text-notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get text notes for this user
      const textNotes = await storage.getTextNotesByUser(req.session.userId);
      
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

      // Get the text note (only if it belongs to this user)
      const textNote = await storage.getTextNoteById(noteId, req.session.userId);
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

      // Create new text note for this user
      const newNote = await storage.createTextNote({
        title,
        content,
        userId: req.session.userId
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

      // Update the text note (ensure it belongs to this user)
      const updatedNote = await storage.updateTextNote(noteId, { title, content }, req.session.userId);
      if (!updatedNote) {
        return res.status(404).json({ error: "Failed to update text note" });
      }

      res.json(updatedNote);
    } catch (error) {
      console.error("Text note update error:", error);
      res.status(500).json({ error: "Failed to update text note" });
    }
  });

  app.delete("/api/text-notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const deleted = await storage.deleteAllTextNotesByUser(req.session.userId);
      res.json({ success: true, deletedCount: deleted });
    } catch (error) {
      console.error("Delete all text notes error:", error);
      res.status(500).json({ error: "Failed to delete all text notes" });
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

      // Delete the text note (ensure it belongs to this user)
      const deleted = await storage.deleteTextNote(noteId, req.session.userId);
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

  // Push Token Endpoints
  app.post("/api/push-tokens", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { token, platform, deviceInfo } = req.body;
      
      if (!token || !platform) {
        return res.status(400).json({ error: "Token and platform are required" });
      }

      // Get current user's family member
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      
      // Create or update push token
      const pushToken = await storage.createPushToken({
        userId: req.session.userId,
        familyMemberId: familyMember?.id || null,
        token,
        platform,
        deviceInfo,
        isActive: true,
      });

      res.json(pushToken);
    } catch (error) {
      console.error("Create push token error:", error);
      res.status(500).json({ error: "Failed to save push token" });
    }
  });

  app.post("/api/admin/test-sms", async (req, res) => {
    try {
      if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
      const user = await storage.getUserById(req.session.userId);
      if (!user || user.email !== "wearesubsonic@gmail.com") return res.status(403).json({ error: "Admin access only" });

      const { to, message } = req.body;
      if (!to || !message) return res.status(400).json({ error: "to and message required" });

      const result = await sendSMS(to, message);
      res.json({ success: result, to, message });
    } catch (error) {
      console.error("Admin test SMS error:", error);
      res.status(500).json({ error: "Failed to send test SMS" });
    }
  });

  app.get("/api/admin/metrics", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserById(req.session.userId);
      if (!user || user.email !== "wearesubsonic@gmail.com") {
        return res.status(403).json({ error: "Admin access only" });
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const daysParam = req.query.days ? Number(req.query.days) : null;
      let dateFilter: Date | null = null;
      if (daysParam) {
        dateFilter = new Date(today.getTime() - daysParam * 24 * 60 * 60 * 1000);
      }

      const [
        totalUsersResult,
        newUsersWeekResult,
        newUsersMonthResult,
        totalFamiliesResult,
        totalFamilyMembersResult,
        totalTeensResult,
        totalChildrenResult,
        subscriptionsResult,
        totalTasksResult,
        completedTasksResult,
        totalEventsResult,
        totalVoiceNotesResult,
        totalTextNotesResult,
        totalMealPlansResult,
        totalGroceryItemsResult,
        totalPasswordsResult,
        pushTokensResult,
        feedbackResult,
        featureRequestsResult,
        referralSharesResult,
        satisfactionResult,
        recentUsersResult,
        signupsByDayResult,
        authMethodsResult,
        activeTrialsResult,
      ] = await Promise.all([
        dateFilter
          ? db.execute(sql`SELECT COUNT(*) as count FROM users WHERE created_at >= ${dateFilter}`)
          : db.execute(sql`SELECT COUNT(*) as count FROM users`),
        db.execute(sql`SELECT COUNT(*) as count FROM users WHERE created_at >= ${weekAgo}`),
        db.execute(sql`SELECT COUNT(*) as count FROM users WHERE created_at >= ${monthAgo}`),
        db.execute(sql`SELECT COUNT(*) as count FROM families`),
        db.execute(sql`SELECT COUNT(*) as count FROM family_members`),
        db.execute(sql`SELECT COUNT(*) as count FROM teen_profiles`),
        db.execute(sql`SELECT COUNT(*) as count FROM child_profiles`),
        db.execute(sql`SELECT subscription_plan, subscription_status, COUNT(*) as count FROM user_subscriptions GROUP BY subscription_plan, subscription_status`),
        dateFilter
          ? db.execute(sql`SELECT COUNT(*) as count FROM tasks WHERE created_at >= ${dateFilter}`)
          : db.execute(sql`SELECT COUNT(*) as count FROM tasks`),
        dateFilter
          ? db.execute(sql`SELECT COUNT(*) as count FROM tasks WHERE is_completed = true AND created_at >= ${dateFilter}`)
          : db.execute(sql`SELECT COUNT(*) as count FROM tasks WHERE is_completed = true`),
        dateFilter
          ? db.execute(sql`SELECT COUNT(*) as count FROM events WHERE start_time >= ${dateFilter}`)
          : db.execute(sql`SELECT COUNT(*) as count FROM events`),
        dateFilter
          ? db.execute(sql`SELECT COUNT(*) as count FROM voice_notes WHERE created_at >= ${dateFilter}`)
          : db.execute(sql`SELECT COUNT(*) as count FROM voice_notes`),
        dateFilter
          ? db.execute(sql`SELECT COUNT(*) as count FROM text_notes WHERE created_at >= ${dateFilter}`)
          : db.execute(sql`SELECT COUNT(*) as count FROM text_notes`),
        dateFilter
          ? db.execute(sql`SELECT COUNT(*) as count FROM meal_plans WHERE created_at >= ${dateFilter}`)
          : db.execute(sql`SELECT COUNT(*) as count FROM meal_plans`),
        dateFilter
          ? db.execute(sql`SELECT COUNT(*) as count FROM grocery_items WHERE created_at >= ${dateFilter}`)
          : db.execute(sql`SELECT COUNT(*) as count FROM grocery_items`),
        db.execute(sql`SELECT COUNT(*) as count FROM passwords`),
        db.execute(sql`SELECT COUNT(*) as count, COUNT(CASE WHEN is_active = true THEN 1 END) as active_count FROM push_tokens`),
        db.execute(sql`SELECT COUNT(*) as count, response, COUNT(CASE WHEN review_requested = true THEN 1 END) as review_requested FROM feedback_prompts GROUP BY response`),
        db.execute(sql`SELECT type, status, COUNT(*) as count FROM feature_requests GROUP BY type, status`),
        db.execute(sql`SELECT platform, COUNT(*) as count, COUNT(CASE WHEN bonus_awarded = true THEN 1 END) as bonus_count FROM referral_shares GROUP BY platform`),
        db.execute(sql`SELECT response, COUNT(*) as count FROM user_satisfaction_prompts GROUP BY response`),
        db.execute(sql`SELECT id, email, first_name, last_name, auth_method, created_at FROM users ORDER BY created_at DESC LIMIT 20`),
        db.execute(sql`SELECT DATE(created_at) as signup_date, COUNT(*) as count FROM users WHERE created_at >= ${monthAgo} GROUP BY DATE(created_at) ORDER BY signup_date`),
        db.execute(sql`SELECT auth_method, COUNT(*) as count FROM users GROUP BY auth_method`),
        db.execute(sql`
          SELECT us.id, us.user_id, us.subscription_plan, us.subscription_status, 
                 us.trial_start_date, us.trial_end_date, us.created_at,
                 us.google_product_id, us.apple_product_id,
                 u.email, u.first_name, u.last_name
          FROM user_subscriptions us
          JOIN users u ON u.id = us.user_id
          WHERE us.trial_end_date > ${now}
            AND us.subscription_status IN ('active', 'trial')
            AND (us.stripe_subscription_id IS NULL OR us.stripe_subscription_id = '')
            AND u.email NOT IN (
              'test@themom.app','emily@themom.app','themomapp.us@gmail.com',
              'wearesubsonic@gmail.com','emmett0823@gmail.com','tjwaltonmarketing@gmail.com'
            )
          ORDER BY us.trial_end_date ASC
        `),
      ]);

      res.json({
        users: {
          total: Number(totalUsersResult.rows[0]?.count || 0),
          newThisWeek: Number(newUsersWeekResult.rows[0]?.count || 0),
          newThisMonth: Number(newUsersMonthResult.rows[0]?.count || 0),
          recentSignups: recentUsersResult.rows,
          signupsByDay: signupsByDayResult.rows,
          authMethods: authMethodsResult.rows,
        },
        families: {
          total: Number(totalFamiliesResult.rows[0]?.count || 0),
          totalMembers: Number(totalFamilyMembersResult.rows[0]?.count || 0),
          totalTeens: Number(totalTeensResult.rows[0]?.count || 0),
          totalChildren: Number(totalChildrenResult.rows[0]?.count || 0),
        },
        subscriptions: subscriptionsResult.rows,
        activeTrials: activeTrialsResult.rows,
        engagement: {
          tasks: {
            total: Number(totalTasksResult.rows[0]?.count || 0),
            completed: Number(completedTasksResult.rows[0]?.count || 0),
          },
          events: Number(totalEventsResult.rows[0]?.count || 0),
          voiceNotes: Number(totalVoiceNotesResult.rows[0]?.count || 0),
          textNotes: Number(totalTextNotesResult.rows[0]?.count || 0),
          mealPlans: Number(totalMealPlansResult.rows[0]?.count || 0),
          groceryItems: Number(totalGroceryItemsResult.rows[0]?.count || 0),
          passwords: Number(totalPasswordsResult.rows[0]?.count || 0),
        },
        pushNotifications: {
          totalTokens: Number(pushTokensResult.rows[0]?.count || 0),
          activeTokens: Number(pushTokensResult.rows[0]?.active_count || 0),
        },
        feedback: feedbackResult.rows,
        featureRequests: featureRequestsResult.rows,
        referrals: referralSharesResult.rows,
        satisfaction: satisfactionResult.rows,
        dateFilter: daysParam ? `${daysParam} days` : "all time",
      });
    } catch (error) {
      console.error("Admin metrics error:", error);
      res.status(500).json({ error: "Failed to fetch admin metrics" });
    }
  });

  app.get("/api/admin/check", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserById(userId);
      if (!user || user.email !== "wearesubsonic@gmail.com") {
        return res.status(403).json({ isAdmin: false });
      }
      res.json({ isAdmin: true });
    } catch (error) {
      console.error("Admin check error:", error);
      res.status(500).json({ error: "Failed to check admin status" });
    }
  });

  app.get("/api/admin/funnel", async (req, res) => {
    try {
      if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
      const user = await storage.getUserById(req.session.userId);
      if (!user || user.email !== "wearesubsonic@gmail.com") return res.status(403).json({ error: "Admin access only" });

      const daysParam = req.query.days ? Number(req.query.days) : null;
      const dateFilter = daysParam ? new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000) : null;
      const whereClause = dateFilter ? sql`WHERE u.created_at >= ${dateFilter}` : sql`WHERE 1=1`;

      const [registered, trialStarted, paidConverted, churned, dailyFunnel] = await Promise.all([
        // Stage 1: Registered
        dateFilter
          ? db.execute(sql`SELECT COUNT(*) as count FROM users WHERE created_at >= ${dateFilter}`)
          : db.execute(sql`SELECT COUNT(*) as count FROM users`),

        // Stage 2: Started trial (has a subscription record)
        dateFilter
          ? db.execute(sql`SELECT COUNT(DISTINCT u.id) as count FROM users u JOIN user_subscriptions us ON us.user_id = u.id WHERE u.created_at >= ${dateFilter}`)
          : db.execute(sql`SELECT COUNT(DISTINCT u.id) as count FROM users u JOIN user_subscriptions us ON us.user_id = u.id`),

        // Stage 3: Converted to paid
        dateFilter
          ? db.execute(sql`SELECT COUNT(DISTINCT u.id) as count FROM users u JOIN user_subscriptions us ON us.user_id = u.id WHERE u.created_at >= ${dateFilter} AND (us.stripe_subscription_id IS NOT NULL OR us.apple_product_id IS NOT NULL OR us.google_product_id IS NOT NULL)`)
          : db.execute(sql`SELECT COUNT(DISTINCT u.id) as count FROM users u JOIN user_subscriptions us ON us.user_id = u.id WHERE (us.stripe_subscription_id IS NOT NULL OR us.apple_product_id IS NOT NULL OR us.google_product_id IS NOT NULL)`),

        // Stage 4: Churned (trial ended, never paid)
        dateFilter
          ? db.execute(sql`SELECT COUNT(DISTINCT u.id) as count FROM users u JOIN user_subscriptions us ON us.user_id = u.id WHERE u.created_at >= ${dateFilter} AND us.trial_end_date < NOW() AND us.stripe_subscription_id IS NULL AND us.apple_product_id IS NULL AND us.google_product_id IS NULL`)
          : db.execute(sql`SELECT COUNT(DISTINCT u.id) as count FROM users u JOIN user_subscriptions us ON us.user_id = u.id WHERE us.trial_end_date < NOW() AND us.stripe_subscription_id IS NULL AND us.apple_product_id IS NULL AND us.google_product_id IS NULL`),

        // Daily registrations + trial starts for chart (last 30 days)
        db.execute(sql`
          SELECT
            DATE(u.created_at) as date,
            COUNT(DISTINCT u.id) as registered,
            COUNT(DISTINCT us.user_id) as trial_started
          FROM users u
          LEFT JOIN user_subscriptions us ON us.user_id = u.id
          WHERE u.created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(u.created_at)
          ORDER BY date
        `),
      ]);

      const r = Number(registered.rows[0]?.count || 0);
      const t = Number(trialStarted.rows[0]?.count || 0);
      const p = Number(paidConverted.rows[0]?.count || 0);
      const c = Number(churned.rows[0]?.count || 0);

      res.json({
        stages: [
          { label: "Registered", count: r, pct: 100 },
          { label: "Started Trial", count: t, pct: r > 0 ? Math.round((t / r) * 100) : 0 },
          { label: "Converted to Paid", count: p, pct: t > 0 ? Math.round((p / t) * 100) : 0 },
          { label: "Churned (Trial Expired)", count: c, pct: t > 0 ? Math.round((c / t) * 100) : 0 },
        ],
        dropOff: r > 0 ? r - t : 0,
        dailyChart: dailyFunnel.rows,
        dateFilter: daysParam ? `${daysParam} days` : "all time",
      });
    } catch (error) {
      console.error("Admin funnel error:", error);
      res.status(500).json({ error: "Failed to fetch funnel data" });
    }
  });

  app.post("/api/push-notifications/test", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserById(req.session.userId);
      if (!user || user.email !== "wearesubsonic@gmail.com") {
        return res.status(403).json({ error: "Admin access only" });
      }

      const { sendPushNotification } = await import("./firebase-push");
      const result = await sendPushNotification({
        userId: req.session.userId,
        title: "The Mom App",
        body: "Push notifications are working! You're all set.",
        data: { type: "test" },
      });

      res.json({ 
        success: result.success, 
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        message: result.sentCount > 0 
          ? "Test notification sent successfully!" 
          : "No registered devices found. Make sure the app is installed and notifications are enabled."
      });
    } catch (error) {
      console.error("Test push notification error:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  // Returns Google OAuth URL as JSON — used by mobile to avoid App Links interception
  app.get("/api/calendar/auth-url", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const calendarService = new GoogleCalendarService();
      const authUrl = calendarService.generateAuthUrl(req.session.userId);
      res.json({ url: authUrl });
    } catch (error) {
      console.error("Calendar auth-url error:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  // Google Calendar Import Endpoints
  app.get("/api/calendar/connect", async (req, res) => {
    try {
      // Support JWT token from multiple sources (needed for mobile/Capacitor)
      let userId = req.session.userId;
      if (!userId) {
        // Try query param (new APK), cookie (all versions), or Authorization header
        const tokenSources = [
          req.query.token as string,
          // Parse auth_token from raw Cookie header
          (() => {
            const cookieHeader = req.headers.cookie || '';
            const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : null;
          })(),
          (req.headers.authorization || '').replace('Bearer ', '')
        ];
        for (const token of tokenSources) {
          if (!token) continue;
          try {
            const decoded = verifyToken(token);
            if (decoded?.userId) {
              userId = decoded.userId;
              req.session.userId = userId;
              break;
            }
          } catch { /* try next */ }
        }
      }

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const calendarService = new GoogleCalendarService();
      // Embed userId in OAuth state so callback works even when opened in external browser
      const authUrl = calendarService.generateAuthUrl(userId);
      
      req.session.calendarOAuthUserId = userId;
      
      res.redirect(authUrl);
    } catch (error) {
      console.error("Calendar connect error:", error);
      res.status(500).json({ error: "Failed to initiate Google Calendar connection" });
    }
  });

  app.get("/api/calendar/callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      
      if (error) {
        return res.redirect(`/?error=${error}`);
      }

      if (!code || typeof code !== 'string') {
        return res.redirect('/?error=missing_code');
      }

      const calendarService = new GoogleCalendarService();
      const tokens = await calendarService.getTokensFromCode(code);

      // Decode userId from state param (works even when callback fires in external browser)
      let userIdFromState: number | null = null;
      const stateParam = req.query.state as string | undefined;
      if (stateParam) {
        try {
          const decoded = JSON.parse(Buffer.from(stateParam, 'base64').toString('utf8'));
          if (decoded.userId) userIdFromState = decoded.userId;
        } catch { /* ignore malformed state */ }
      }

      // Store tokens in DB (so they persist across sessions and work on mobile)
      const userId = userIdFromState || req.session.calendarOAuthUserId || req.session.userId;
      if (userId) {
        await db.update(users)
          .set({ googleCalendarTokens: JSON.stringify(tokens) })
          .where(eq(users.id, userId));
      }
      // Also keep in session as fallback
      req.session.googleCalendarTokens = tokens;
      
      res.redirect('/calendar?calendar_connected=true');
    } catch (error) {
      console.error("Calendar callback error:", error);
      res.redirect('/?error=oauth_failed');
    }
  });

  app.get("/api/calendar/calendars", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get tokens from DB first, fall back to session
      let tokens = req.session.googleCalendarTokens;
      if (!tokens) {
        const [userRow] = await db.select({ googleCalendarTokens: users.googleCalendarTokens })
          .from(users).where(eq(users.id, req.session.userId));
        if (userRow?.googleCalendarTokens) {
          tokens = JSON.parse(userRow.googleCalendarTokens);
          req.session.googleCalendarTokens = tokens;
        }
      }

      if (!tokens) {
        return res.json({ calendars: [] });
      }

      const calendarService = new GoogleCalendarService();
      calendarService.setCredentials(tokens);
      
      const calendars = await calendarService.listCalendars();
      res.json({ calendars });
    } catch (error) {
      console.error("List calendars error:", error);
      res.status(500).json({ error: "Failed to fetch calendars" });
    }
  });

  app.post("/api/calendar/import", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get tokens from DB first, fall back to session
      let calTokens = req.session.googleCalendarTokens;
      if (!calTokens) {
        const [userRow] = await db.select({ googleCalendarTokens: users.googleCalendarTokens })
          .from(users).where(eq(users.id, req.session.userId));
        if (userRow?.googleCalendarTokens) {
          calTokens = JSON.parse(userRow.googleCalendarTokens);
          req.session.googleCalendarTokens = calTokens;
        }
      }

      if (!calTokens) {
        return res.status(401).json({ error: "Not connected to Google Calendar" });
      }

      const { calendarId = 'primary', daysToImport = 365, visibilityType = 'private' } = req.body;

      // Get family membership
      const familyMembership = await storage.getUserFamilyMembership(req.session.userId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get user's family member record
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      if (!familyMember) {
        return res.status(404).json({ error: "Family member not found" });
      }

      const calendarService = new GoogleCalendarService();
      calendarService.setCredentials(calTokens);
      
      const googleEvents = await calendarService.importEvents(calendarId, daysToImport);
      
      // Import events into the database
      let importedCount = 0;
      // Parse a Google Calendar date string correctly.
      // Date-only strings like "2025-03-15" (all-day events) must be treated as
      // LOCAL midnight, not UTC midnight. new Date("2025-03-15") = UTC = wrong timezone.
      // Adding T00:00:00 (no Z) forces JavaScript to use local time instead.
      const parseGCalDate = (dateStr: string): Date => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          // All-day events have date-only strings (no time, no timezone).
          // Storing as noon UTC keeps the date correct in all US timezones —
          // UTC midnight would appear as the PREVIOUS day at 6-7 PM locally.
          return new Date(`${dateStr}T12:00:00Z`);
        }
        return new Date(dateStr);
      };

      for (const googleEvent of googleEvents) {
        try {
          await storage.createEvent({
            title: googleEvent.title,
            description: googleEvent.description,
            startTime: parseGCalDate(googleEvent.startTime),
            endTime: googleEvent.endTime ? parseGCalDate(googleEvent.endTime) : null,
            location: googleEvent.location,
            familyId: familyMembership.familyId,
            assignedTo: [], // No specific assignments for imported events
            isAllDay: googleEvent.isAllDay,
            isPrivate: visibilityType === "private",
            visibilityType: visibilityType as "shared" | "busy" | "private",
            sharedWith: [],
            createdBy: familyMember.id
          });
          importedCount++;
        } catch (error) {
          console.error("Error importing event:", error);
          // Continue with other events even if one fails
        }
      }

      res.json({ 
        success: true, 
        imported: importedCount, 
        total: googleEvents.length 
      });
    } catch (error) {
      console.error("Calendar import error:", error);
      res.status(500).json({ error: "Failed to import calendar events" });
    }
  });

  app.post("/api/calendar/ical-import", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "iCal URL is required" });
      }

      // Validate it looks like a URL
      try { new URL(url); } catch { return res.status(400).json({ error: "Invalid URL format" }); }

      // Fetch the iCal file
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        return res.status(400).json({ error: `Could not fetch iCal feed (HTTP ${response.status}). Check the URL and try again.` });
      }
      const text = await response.text();

      if (!text.includes('BEGIN:VCALENDAR')) {
        return res.status(400).json({ error: "The URL does not appear to be a valid iCal feed." });
      }

      // Simple iCal parser
      const parseIcalValue = (value: string): string => {
        // Unfold lines (continuation lines start with space/tab)
        return value.replace(/\r?\n[ \t]/g, '').replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
      };

      const parseIcalDate = (value: string): Date | null => {
        try {
          const clean = value.split(';').pop() || value; // handle VALUE=DATE etc
          if (clean.includes('T')) {
            // datetime
            const m = clean.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
            if (!m) return null;
            const [, yr, mo, dy, hr, min, sec, utc] = m;
            const d = new Date(`${yr}-${mo}-${dy}T${hr}:${min}:${sec}${utc ? 'Z' : ''}`);
            return isNaN(d.getTime()) ? null : d;
          } else {
            // Date-only = all-day event. Store as noon UTC to keep the correct
            // date in all US timezones (midnight UTC shifts to previous day locally).
            const m = clean.match(/(\d{4})(\d{2})(\d{2})/);
            if (!m) return null;
            const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
            return isNaN(d.getTime()) ? null : d;
          }
        } catch { return null; }
      };

      // Get user's family
      const user = await storage.getUser(req.session.userId);
      if (!user?.familyId) {
        return res.status(400).json({ error: "No family found" });
      }

      // Parse VEVENT blocks
      const eventBlocks = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30); // import from 30 days ago onward
      const future = new Date();
      future.setFullYear(future.getFullYear() + 2);

      let imported = 0;
      let skipped = 0;

      for (const block of eventBlocks) {
        const lines: string[] = [];
        // Unfold
        block.split(/\r?\n/).forEach(line => {
          if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
            lines[lines.length - 1] += line.slice(1);
          } else {
            lines.push(line);
          }
        });

        const get = (key: string): string => {
          for (const line of lines) {
            const upper = line.toUpperCase();
            if (upper.startsWith(key + ':') || upper.startsWith(key + ';')) {
              return parseIcalValue(line.substring(line.indexOf(':') + 1).trim());
            }
          }
          return '';
        };

        const summary = get('SUMMARY');
        const dtstart = get('DTSTART');
        const dtend = get('DTEND');
        const description = get('DESCRIPTION');
        const location = get('LOCATION');
        const uid = get('UID');

        if (!summary || !dtstart) { skipped++; continue; }

        const startDate = parseIcalDate(dtstart);
        if (!startDate || startDate < cutoff || startDate > future) { skipped++; continue; }

        const endDate = dtend ? parseIcalDate(dtend) : null;

        await storage.createEvent({
          title: summary,
          startTime: startDate,
          endTime: endDate || undefined,
          description: description || undefined,
          location: location || undefined,
          familyId: user.familyId,
          createdBy: req.session.userId,
          eventType: 'shared',
          isAllDay: !dtstart.includes('T'),
        });
        imported++;
      }

      res.json({ success: true, imported, skipped, total: eventBlocks.length });
    } catch (error: any) {
      console.error("iCal import error:", error);
      res.status(500).json({ error: error.message || "Failed to import iCal feed" });
    }
  });

  app.post("/api/calendar/disconnect", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Clear tokens from DB and session
      await db.update(users)
        .set({ googleCalendarTokens: null })
        .where(eq(users.id, req.session.userId));
      delete req.session.googleCalendarTokens;
      delete req.session.calendarOAuthUserId;
      
      res.json({ success: true });
    } catch (error) {
      console.error("Calendar disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect calendar" });
    }
  });

  // Subscription Endpoints
  app.get("/api/subscription", async (req, res) => {
    try {
      let userId = req.session.userId;
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const { verifyToken } = await import('./auth');
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId;
            req.session.userId = userId;
          }
        }
      }
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      let subscription = await storage.getUserSubscription(userId);
      
      if (!subscription) {
        // Check if user is part of a family (joined via invite)
        const family = await storage.getFamilyByUserId(userId);
        if (family && family.ownerId !== userId) {
          // User is a family member (not owner) - get owner's subscription
          const ownerSubscription = await storage.getUserSubscription(family.ownerId);
          if (ownerSubscription) {
            subscription = ownerSubscription;
          } else {
            // Family member joined but owner hasn't set up trial yet
            // Return a "pending" status so they can access the dashboard
            return res.json({
              subscriptionPlan: "family",
              subscriptionStatus: "pending_owner_setup",
              trialDaysLeft: 14,
              isFamilyMember: true
            });
          }
        }
      }
      
      if (!subscription) {
        // No subscription exists - user needs to complete onboarding first
        return res.json(null);
      }

      let trialDaysLeft = 0;
      const isOnTrial = subscription.subscriptionStatus === "trial" && subscription.trialEndDate && new Date(subscription.trialEndDate) > new Date();
      if (isOnTrial) {
        trialDaysLeft = Math.max(0, Math.ceil((subscription.trialEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
      }

      const referralShares = await storage.getReferralSharesByUser(req.session.userId);
      const bonusClaimed = referralShares.some(s => s.bonusAwarded);

      res.json({
        ...subscription,
        trialDaysLeft,
        isOnTrial: !!isOnTrial,
        bonusClaimed,
      });
    } catch (error) {
      console.error("Get subscription error:", error);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  // Start Trial Endpoint
  app.post("/api/subscription/start-trial", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { plan } = req.body;
      
      if (!plan || !["individual", "family"].includes(plan)) {
        return res.status(400).json({ error: "Valid plan (individual or family) is required" });
      }

      // Check if subscription already exists
      const existingSubscription = await storage.getUserSubscription(req.session.userId);
      
      if (existingSubscription) {
        // Update existing subscription with new plan
        const updated = await storage.updateUserSubscription(req.session.userId, {
          subscriptionPlan: plan,
          subscriptionStatus: "trial",
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        });
        return res.json(updated);
      }

      // Create new trial subscription
      const newSubscription = await storage.createUserSubscription({
        userId: req.session.userId,
        subscriptionPlan: plan,
        subscriptionStatus: "trial",
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      });

      res.json(newSubscription);
    } catch (error) {
      console.error("Start trial error:", error);
      res.status(500).json({ error: "Failed to start trial" });
    }
  });

  // Track referral share and optionally extend trial
  app.post("/api/referral/share", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { platform } = req.body; // "facebook", "instagram", or "skip"
      
      if (!platform) {
        return res.status(400).json({ error: "Platform is required" });
      }

      // Check if user already received a bonus (prevent duplicate awards)
      const existingShares = await storage.getReferralSharesByUser(req.session.userId);
      const alreadyReceivedBonus = existingShares.some(s => s.bonusAwarded);

      // Create the referral share record
      const bonusAwarded = platform !== "skip" && !alreadyReceivedBonus;
      const bonusDays = bonusAwarded ? 7 : 0;

      const share = await storage.createReferralShare({
        userId: req.session.userId,
        platform,
        bonusAwarded,
        bonusDays,
      });

      // If they shared (not skipped) and haven't already received bonus, extend their trial by 7 days
      if (bonusAwarded) {
        const subscription = await storage.getUserSubscription(req.session.userId);
        if (subscription && subscription.trialEndDate) {
          const newTrialEndDate = new Date(subscription.trialEndDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          await storage.updateUserSubscription(req.session.userId, {
            trialEndDate: newTrialEndDate,
          });
        }
      }

      res.json({ 
        success: true, 
        bonusAwarded,
        bonusDays,
        message: bonusAwarded ? "Your trial has been extended by 7 days!" : alreadyReceivedBonus ? "You've already claimed your bonus!" : "No problem, enjoy your trial!"
      });
    } catch (error) {
      console.error("Referral share error:", error);
      res.status(500).json({ error: "Failed to track share" });
    }
  });

  // Get referral share analytics (admin only - for now any authenticated user)
  app.get("/api/referral/stats", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const stats = await storage.getReferralShareStats();
      const shareRate = stats.total > 0 ? Math.round((stats.shared / stats.total) * 100) : 0;

      res.json({
        ...stats,
        shareRate,
      });
    } catch (error) {
      console.error("Referral stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // Initialize Stripe products on startup
  initializeStripeProducts().catch(err => console.error("Failed to initialize Stripe:", err));

  // Create Stripe checkout session
  app.post("/api/checkout/create-session", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { plan, interval, trialDays, coupon } = req.body;

      if (!plan || !["individual", "family"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      if (!interval || !["monthly", "yearly"].includes(interval)) {
        return res.status(400).json({ error: "Invalid interval" });
      }

      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const baseUrl = "https://app.themom.app";

      const session = await createCheckoutSession(
        user.id,
        user.email,
        plan as "individual" | "family",
        interval as "monthly" | "yearly",
        `${baseUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}/upgrade?cancelled=true`,
        trialDays ? Number(trialDays) : undefined,
        coupon || undefined
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout session error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Stripe webhook endpoint (must use raw body)
  app.post("/api/webhook/stripe", async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"];
      
      if (!sig) {
        return res.status(400).json({ error: "No signature" });
      }

      // For now, we'll process without signature verification for simplicity
      // In production, you'd verify the webhook signature
      const event = req.body;

      const result = await handleWebhookEvent(event);

      if (result?.type === "checkout_completed" && result.userId && result.plan) {
        // Update user's subscription status
        await storage.updateUserSubscription(result.userId, {
          subscriptionPlan: result.plan,
          subscriptionStatus: "active",
          stripeSubscriptionId: result.subscriptionId,
          stripeCustomerId: result.customerId,
          billingInterval: result.interval,
          trialEndDate: null, // Trial is over, they're now a paying customer
        });
        console.log(`Subscription activated for user ${result.userId}: ${result.plan} ${result.interval}`);
      } else if (result?.type === "subscription_cancelled" && result.userId) {
        await storage.updateUserSubscription(result.userId, {
          subscriptionStatus: "cancelled",
        });
        console.log(`Subscription cancelled for user ${result.userId}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: "Webhook error" });
    }
  });

  // Verify checkout session completion
  // No auth required — session ID is an unguessable Stripe token; userId comes from session metadata
  app.get("/api/checkout/verify/:sessionId", async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

      // Accept both "paid" and "no_payment_required" (trial subscriptions)
      const isComplete = session.status === "complete" &&
        (session.payment_status === "paid" || session.payment_status === "no_payment_required");

      if (isComplete && session.metadata?.userId) {
        const userId = parseInt(session.metadata.userId);
        await storage.updateUserSubscription(userId, {
          subscriptionPlan: session.metadata.plan as "individual" | "family",
          subscriptionStatus: "active",
          stripeSubscriptionId: session.subscription as string,
          stripeCustomerId: session.customer as string,
          billingInterval: session.metadata.interval as "monthly" | "yearly",
          trialEndDate: null,
        });

        res.json({ success: true, plan: session.metadata.plan });
      } else {
        res.status(400).json({ error: "Payment not completed" });
      }
    } catch (error) {
      console.error("Verify checkout error:", error);
      res.status(500).json({ error: "Failed to verify checkout" });
    }
  });

  // Stripe Customer Portal - manage/cancel subscription
  app.post("/api/subscription/portal", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const subscription = await storage.getUserSubscription(req.session.userId);
      if (!subscription?.stripeCustomerId) {
        return res.status(400).json({ error: "No active Stripe subscription found" });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: req.body.returnUrl || "https://app.themom.app/subscription",
      });

      res.json({ url: portalSession.url });
    } catch (error) {
      console.error("Portal session error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // Cancel subscription directly
  app.post("/api/subscription/cancel", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const subscription = await storage.getUserSubscription(req.session.userId);
      if (!subscription?.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription to cancel" });
      }

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await storage.updateUserSubscription(req.session.userId, {
        subscriptionStatus: "cancelling",
      });

      res.json({ success: true, message: "Subscription will cancel at end of billing period" });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  app.post("/api/subscription/apple-purchase", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { productIdentifier, plan, interval, activeEntitlements, expirationDate } = req.body;

      if (!productIdentifier || !plan) {
        return res.status(400).json({ error: "Missing product info" });
      }

      const validPlans = ["individual", "family"];
      if (!validPlans.includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const appleTrialEnd = expirationDate ? new Date(expirationDate) : (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; })();

      await storage.updateUserSubscription(req.session.userId, {
        subscriptionPlan: plan,
        subscriptionStatus: "trial",
        billingInterval: interval || "monthly",
        appleProductId: productIdentifier,
        trialEndDate: appleTrialEnd,
      });

      console.log(`[Apple IAP] User ${req.session.userId} started trial for ${productIdentifier} (${plan}/${interval}), trial ends ${appleTrialEnd.toISOString()}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Apple purchase error:", error);
      res.status(500).json({ error: "Failed to process Apple purchase" });
    }
  });

  app.post("/api/subscription/apple-restore", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { activeEntitlements, activeSubscriptions, expirationDate } = req.body;

      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        return res.status(400).json({ error: "No active subscriptions to restore" });
      }

      let plan: "individual" | "family" = "individual";
      for (const sub of activeSubscriptions) {
        if (sub.includes("family")) {
          plan = "family";
          break;
        }
      }

      let interval: "monthly" | "yearly" = "monthly";
      for (const sub of activeSubscriptions) {
        if (sub.includes("yearly")) {
          interval = "yearly";
          break;
        }
      }

      await storage.updateUserSubscription(req.session.userId, {
        subscriptionPlan: plan,
        subscriptionStatus: "active",
        billingInterval: interval,
        appleProductId: activeSubscriptions[0],
        trialEndDate: null,
      });

      console.log(`[Apple IAP] User ${req.session.userId} restored purchase: ${activeSubscriptions.join(", ")}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Apple restore error:", error);
      res.status(500).json({ error: "Failed to restore purchases" });
    }
  });

  // Google Play Billing via RevenueCat
  app.post("/api/subscription/google-purchase", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { productIdentifier, plan, interval, activeEntitlements, expirationDate } = req.body;

      if (!productIdentifier || !plan) {
        return res.status(400).json({ error: "Missing product info" });
      }

      const validPlans = ["individual", "family"];
      if (!validPlans.includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const googleTrialEnd = new Date();
      googleTrialEnd.setDate(googleTrialEnd.getDate() + 14);

      await storage.updateUserSubscription(req.session.userId, {
        subscriptionPlan: plan,
        subscriptionStatus: "trial",
        billingInterval: interval || "monthly",
        googleProductId: productIdentifier,
        trialEndDate: googleTrialEnd,
      });

      console.log(`[Google Play] User ${req.session.userId} started trial for ${productIdentifier} (${plan}/${interval}), trial ends ${googleTrialEnd.toISOString()}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Google purchase error:", error);
      res.status(500).json({ error: "Failed to process Google purchase" });
    }
  });

  app.post("/api/subscription/google-restore", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { activeEntitlements, activeSubscriptions, expirationDate } = req.body;

      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        return res.status(400).json({ error: "No active subscriptions to restore" });
      }

      let plan: "individual" | "family" = "individual";
      for (const sub of activeSubscriptions) {
        if (sub.includes("family")) {
          plan = "family";
          break;
        }
      }

      let interval: "monthly" | "yearly" = "monthly";
      for (const sub of activeSubscriptions) {
        if (sub.includes("yearly")) {
          interval = "yearly";
          break;
        }
      }

      await storage.updateUserSubscription(req.session.userId, {
        subscriptionPlan: plan,
        subscriptionStatus: "active",
        billingInterval: interval,
        appleProductId: activeSubscriptions[0],
        trialEndDate: null,
      });

      console.log(`[Google Play] User ${req.session.userId} restored purchase: ${activeSubscriptions.join(", ")}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Google restore error:", error);
      res.status(500).json({ error: "Failed to restore purchases" });
    }
  });

  // AI Chat Endpoint with Event/Task Creation
  app.post("/api/ai/chat", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { message, conversationHistory } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get user's family context
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      let familyMembers: any[] = [];
      let familyId: number | null = null;
      
      if (familyMember) {
        familyId = familyMember.familyId;
        familyMembers = await storage.getFamilyMembersByFamilyId(familyMember.familyId);
      }

      // Process with AI including action detection and conversation history
      const { processAIChatWithActions } = await import("./ai");
      const result = await processAIChatWithActions(message, familyMembers, familyId, req.session.userId!, conversationHistory);

      // Execute any detected actions
      console.log("AI Chat - Actions detected:", result.actions?.length || 0, "familyId:", familyId);
      
      if (result.actions && result.actions.length > 0 && !familyId) {
        console.log("AI Chat - Cannot execute actions: User has no family");
        result.message = result.message + "\n\n(Note: Actions could not be saved because your account is not connected to a family. Please complete your profile setup first.)";
      }
      
      if (result.actions && result.actions.length > 0 && familyId) {
        // Execute all actions in parallel for faster performance
        await Promise.all(result.actions.map(async (action) => {
          console.log("AI Chat - Executing action:", action.type, action.data?.title || action.data?.meal || "");
          try {
            if (action.type === "create_event" && action.data) {
              const eventData = {
                title: action.data.title,
                description: action.data.description || "",
                startTime: new Date(action.data.startTime),
                endTime: action.data.endTime ? new Date(action.data.endTime) : new Date(new Date(action.data.startTime).getTime() + 60 * 60 * 1000),
                allDay: action.data.allDay || false,
                privacyType: "shared" as const,
                familyId: familyId,
                createdBy: familyMember!.id,
                createdAt: new Date(),
                assignedTo: action.data.assignedTo || null,
                recurrence: null,
                location: action.data.location || null,
                color: "#EC4899",
                reminders: null,
              };
              await storage.createEvent(eventData);
              action.executed = true;
            } else if (action.type === "create_task" && action.data) {
              const taskData = {
                title: action.data.title,
                description: action.data.description || "",
                priority: action.data.priority || "medium",
                dueDate: action.data.dueDate ? new Date(action.data.dueDate) : null,
                familyId: familyId,
                createdBy: familyMember!.id,
                assignedTo: action.data.assignedTo || null,
                isRecurring: false,
                recurrencePattern: null,
                points: 10,
                createdAt: new Date(),
              };
              await storage.createTask(taskData);
              action.executed = true;
            } else if (action.type === "create_note" && action.data) {
              const noteData = {
                content: action.data.content,
                transcription: action.data.content,
                familyId: familyId,
                createdBy: familyMember!.id,
                createdAt: new Date(),
              };
              await storage.createVoiceNote(noteData);
              action.executed = true;
            } else if (action.type === "create_meal" && action.data) {
              // Normalize day to lowercase for consistency with meal planning component
              const normalizedDay = (action.data.day || "monday").toLowerCase();
              const capitalizedDay = normalizedDay.charAt(0).toUpperCase() + normalizedDay.slice(1);
              const mealType = action.data.mealType || "dinner";
              
              // Check for duplicate meal (same name, day, and meal type created recently)
              const existingMeals = await storage.getMealPlansByFamily(familyId);
              const isDuplicate = existingMeals.some((m: any) => 
                m.meal === action.data.meal && 
                m.day === capitalizedDay && 
                m.mealType === mealType &&
                new Date(m.createdAt).getTime() > Date.now() - 60000 // Created within last minute
              );
              
              if (isDuplicate) {
                console.log("AI skipped duplicate meal:", action.data.meal);
                action.executed = true;
              } else {
                // Parse ingredients - can be comma-separated string or array
                let ingredients: string[] = [];
                if (action.data.ingredients) {
                  if (typeof action.data.ingredients === 'string') {
                    ingredients = action.data.ingredients.split(',').map((i: string) => i.trim()).filter((i: string) => i);
                  } else if (Array.isArray(action.data.ingredients)) {
                    ingredients = action.data.ingredients;
                  }
                }
                const mealData = {
                  meal: action.data.meal,
                  day: capitalizedDay,
                  mealType: mealType,
                  ingredients: ingredients,
                  notes: action.data.notes || "",
                  createdBy: familyMember?.id || null,
                };
                await storage.createMealPlan(mealData);
                action.executed = true;
                console.log("AI created meal plan:", mealData);
              }
            } else if (action.type === "create_grocery" && action.data) {
              const itemName = action.data.name || action.data.item;
              
              // Check for duplicate grocery item (same name created recently)
              const existingItems = await storage.getGroceryItemsByFamily(familyId);
              const isDuplicate = existingItems.some((g: any) => 
                g.item.toLowerCase() === itemName.toLowerCase() &&
                new Date(g.createdAt).getTime() > Date.now() - 60000 // Created within last minute
              );
              
              if (isDuplicate) {
                console.log("AI skipped duplicate grocery:", itemName);
                action.executed = true;
              } else {
                const groceryData = {
                  item: itemName,
                  category: action.data.category || "other",
                  quantity: action.data.quantity || "1",
                  isCompleted: false,
                  addedBy: familyMember?.id || null,
                };
                await storage.createGroceryItem(groceryData);
                action.executed = true;
                console.log("AI created grocery item:", groceryData);
              }
            }
          } catch (actionError) {
            console.error("Failed to execute action:", action.type, actionError);
            action.executed = false;
          }
        }));
      }

      res.json(result);
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ 
        message: "I'm having trouble processing your request right now. Please try again.",
        actions: []
      });
    }
  });

  // AI Voice Command Endpoint - used by SmartVoiceAssistant component
  // Supports creating events, tasks, notes, meal plans, and grocery items
  app.post("/api/ai/voice-command", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get user's family context
      const familyMember = await storage.getFamilyMemberByUserId(req.session.userId);
      let familyMembers: any[] = [];
      let familyId: number | null = null;
      
      if (familyMember) {
        familyId = familyMember.familyId;
        familyMembers = await storage.getFamilyMembersByFamilyId(familyMember.familyId);
      }

      // Process with AI including action detection (same as chat endpoint)
      const { processAIChatWithActions } = await import("./ai");
      const result = await processAIChatWithActions(message, familyMembers, familyId, req.session.userId!);

      // Execute any detected actions in parallel for faster performance
      if (result.actions && result.actions.length > 0 && familyId) {
        await Promise.all(result.actions.map(async (action) => {
          try {
            if (action.type === "create_event" && action.data) {
              const eventData = {
                title: action.data.title,
                description: action.data.description || "",
                startTime: new Date(action.data.startTime),
                endTime: action.data.endTime ? new Date(action.data.endTime) : new Date(new Date(action.data.startTime).getTime() + 60 * 60 * 1000),
                allDay: action.data.allDay || false,
                privacyType: "shared" as const,
                familyId: familyId,
                createdBy: familyMember!.id,
                createdAt: new Date(),
                assignedTo: action.data.assignedTo || null,
                recurrence: null,
                location: action.data.location || null,
                color: "#EC4899",
                reminders: null,
              };
              await storage.createEvent(eventData);
              action.executed = true;
            } else if (action.type === "create_task" && action.data) {
              const taskData = {
                title: action.data.title,
                description: action.data.description || "",
                priority: action.data.priority || "medium",
                dueDate: action.data.dueDate ? new Date(action.data.dueDate) : null,
                familyId: familyId,
                createdBy: familyMember!.id,
                assignedTo: action.data.assignedTo || null,
                isRecurring: false,
                recurrencePattern: null,
                points: 10,
                createdAt: new Date(),
              };
              await storage.createTask(taskData);
              action.executed = true;
            } else if (action.type === "create_note" && action.data) {
              const noteData = {
                content: action.data.content,
                transcription: action.data.content,
                familyId: familyId,
                createdBy: familyMember!.id,
                createdAt: new Date(),
              };
              await storage.createVoiceNote(noteData);
              action.executed = true;
            } else if (action.type === "create_meal" && action.data) {
              const normalizedDay = (action.data.day || "monday").toLowerCase();
              const capitalizedDay = normalizedDay.charAt(0).toUpperCase() + normalizedDay.slice(1);
              const mealType = action.data.mealType || "dinner";
              
              // Check for duplicate meal (same name, day, and meal type created recently)
              const existingMeals = await storage.getMealPlansByFamily(familyId);
              const isDuplicate = existingMeals.some((m: any) => 
                m.meal === action.data.meal && 
                m.day === capitalizedDay && 
                m.mealType === mealType &&
                new Date(m.createdAt).getTime() > Date.now() - 60000 // Created within last minute
              );
              
              if (isDuplicate) {
                console.log("Voice AI skipped duplicate meal:", action.data.meal);
                action.executed = true;
              } else {
                // Parse ingredients - can be comma-separated string or array
                let ingredients: string[] = [];
                if (action.data.ingredients) {
                  if (typeof action.data.ingredients === 'string') {
                    ingredients = action.data.ingredients.split(',').map((i: string) => i.trim()).filter((i: string) => i);
                  } else if (Array.isArray(action.data.ingredients)) {
                    ingredients = action.data.ingredients;
                  }
                }
                const mealData = {
                  meal: action.data.meal,
                  day: capitalizedDay,
                  mealType: mealType,
                  ingredients: ingredients,
                  notes: action.data.notes || "",
                  createdBy: familyMember?.id || null,
                };
                await storage.createMealPlan(mealData);
                action.executed = true;
                console.log("Voice AI created meal plan:", mealData);
              }
            } else if (action.type === "create_grocery" && action.data) {
              const itemName = action.data.name || action.data.item;
              
              // Check for duplicate grocery item (same name created recently)
              const existingItems = await storage.getGroceryItemsByFamily(familyId);
              const isDuplicate = existingItems.some((g: any) => 
                g.item.toLowerCase() === itemName.toLowerCase() &&
                new Date(g.createdAt).getTime() > Date.now() - 60000 // Created within last minute
              );
              
              if (isDuplicate) {
                console.log("Voice AI skipped duplicate grocery:", itemName);
                action.executed = true;
              } else {
                const groceryData = {
                  item: itemName,
                  category: action.data.category || "other",
                  quantity: action.data.quantity || "1",
                  isCompleted: false,
                  addedBy: familyMember?.id || null,
                };
                await storage.createGroceryItem(groceryData);
                action.executed = true;
                console.log("Voice AI created grocery item:", groceryData);
              }
            }
          } catch (actionError) {
            console.error("Voice command failed to execute action:", action.type, actionError);
            action.executed = false;
          }
        }));
      }

      res.json(result);
    } catch (error) {
      console.error("AI voice command error:", error);
      res.status(500).json({ 
        message: "I'm having trouble processing your voice command right now. Please try again.",
        actions: []
      });
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
        // For parents, try SMS first, fall back to email
        const phoneNumber = await storage.getFamilyMemberPhoneNumber(user.id);
        
        if (phoneNumber) {
          // Send SMS reset code
          const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
          await storage.createSMSPasswordResetToken(user.id, phoneNumber, resetCode);
          const message = `Your Mom App password reset code is: ${resetCode}. This code expires in 1 hour.`;
          const smsSent = await sendSMS(phoneNumber, message);
          if (!smsSent) {
            return res.status(500).json({ error: "Failed to send SMS. Please try again." });
          }
          res.json({ resetType: "sms", message: "Password reset code sent to your phone." });
        } else if (user.email) {
          // Fall back to email reset
          const resetToken = crypto.randomBytes(32).toString("hex");
          await storage.createEmailPasswordResetToken(user.id, resetToken);
          const appUrl = process.env.APP_URL || "https://app.themom.app";
          const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
          const html = createBrandedEmailTemplate(`
            <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:700;">Reset Your Password</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
              We received a request to reset the password for your Mom App account. Click the button below to choose a new password.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="background:linear-gradient(135deg,#EC4899,#A855F7);color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">Reset My Password</a>
            </div>
            <p style="margin:24px 0 0;color:#888;font-size:13px;line-height:1.6;">
              This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't be changed.
            </p>
            <p style="margin:8px 0 0;color:#aaa;font-size:12px;">
              Or copy this link: <a href="${resetUrl}" style="color:#EC4899;word-break:break-all;">${resetUrl}</a>
            </p>
          `);
          const emailResult = await emailService.sendEmail(user.email, "Reset Your Password – The Mom App", html);
          if (!emailResult.success) {
            return res.status(500).json({ error: "Failed to send reset email. Please try again." });
          }
          res.json({ resetType: "email", message: "Password reset link sent to your email." });
        } else {
          return res.status(400).json({ 
            error: "No phone number or email on file. Please contact support for help." 
          });
        }
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

      const familyMemberId = parseInt(req.params.teenId);
      const { newPassword } = req.body;
      
      if (isNaN(familyMemberId)) {
        return res.status(400).json({ error: "Invalid teen ID" });
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      // Get the teen profile by family member ID (frontend passes family member ID, not teen profile ID)
      const teenProfile = await storage.getTeenProfileByFamilyMemberId(familyMemberId);
      if (!teenProfile) {
        return res.status(404).json({ error: "Teen profile not found" });
      }

      // Get the teen's family member record
      const teenFamilyMember = await storage.getFamilyMemberById(familyMemberId);
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

  // Submit feedback or feature request
  app.post("/api/feedback", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { type, subject, message } = req.body;

      if (!type || !subject || !message) {
        return res.status(400).json({ error: "Type, subject, and message are required" });
      }

      // Get user info for the email
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Store in database
      const feedbackRequest = await storage.createFeatureRequest({
        userId: req.session.userId,
        type,
        subject,
        message,
      });

      // Send email notification
      const typeLabel = type === "feature_request" ? "Feature Request" : type === "bug_report" ? "Bug Report" : "Feedback";
      const emailHtml = createBrandedEmailTemplate(`
        <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;font-weight:700;">New ${typeLabel}</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:8px 0;color:#888;font-size:13px;width:80px;">From</td><td style="padding:8px 0;color:#333;font-size:14px;">${user.firstName} ${user.lastName} (${user.email})</td></tr>
          <tr><td style="padding:8px 0;color:#888;font-size:13px;">Type</td><td style="padding:8px 0;color:#333;font-size:14px;"><span style="background:#fdf4fb;color:#EC4899;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">${typeLabel}</span></td></tr>
          <tr><td style="padding:8px 0;color:#888;font-size:13px;">Subject</td><td style="padding:8px 0;color:#333;font-size:14px;font-weight:600;">${subject}</td></tr>
        </table>
        <div style="background:#f9f9f9;border-left:3px solid #EC4899;padding:16px;border-radius:0 8px 8px 0;margin-bottom:16px;">
          <p style="margin:0;color:#444;font-size:14px;line-height:1.7;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        <p style="margin:0;color:#bbb;font-size:11px;">User ID: ${user.id} · ${new Date().toLocaleString()}</p>
      `);

      const emailResult = await emailService.sendEmail(
        "themomapp.us@gmail.com",
        `[The Mom App] ${typeLabel}: ${subject}`,
        emailHtml
      );

      if (!emailResult.success) {
        console.warn("Failed to send feedback email:", emailResult.error);
      }

      res.json({
        success: true,
        message: "Thanks for your submission! Our team has been notified. If your feedback is constructive, you'll be notified if and when it's addressed. If it was a positive note — thank you so much! 💗",
        id: feedbackRequest.id,
      });
    } catch (error) {
      console.error("Feedback submission error:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Daily Digest Scheduler - runs every hour to check which users need their digest
  const runDailyDigestCheck = async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0') + ':00';
      
      // Get all users and their preferences
      const allPreferences = await storage.getAllUserPreferences();
      
      for (const pref of allPreferences) {
        // Check if this user's digest time matches current hour
        if (pref.dailyDigest && pref.dailyDigestTime === currentHour) {
          try {
            await notificationService.sendDailyDigest(pref.userId);
          } catch (error) {
            console.error(`Failed to send daily digest to user ${pref.userId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Daily digest check error:", error);
    }
  };
  
  // Run daily digest check every hour
  setInterval(runDailyDigestCheck, 60 * 60 * 1000); // Every hour
  console.log("📅 Daily digest scheduler initialized");

  // Win-back drip SMS campaign
  const { initWinbackDripScheduler } = await import("./winback-drip");
  initWinbackDripScheduler();

  return server;
}