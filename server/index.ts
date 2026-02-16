import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSession, extractTokenFromRequest, verifyToken } from "./auth";
import { initializeFirebase } from "./firebase-push";
import { storage } from "./storage";

// Set LeadConnector environment variables for testing
if (!process.env.LEADCONNECTOR_API_KEY) {
  process.env.LEADCONNECTOR_API_KEY = "215c65d0-72a8-4221-a0bc-cf39ebfc6acf";
  process.env.LEADCONNECTOR_LOCATION_ID = "Zuv4qgKlSoOyGdkVJtjr";
  console.log("🔧 LeadConnector credentials configured for testing");
}

const app = express();

// Setup session middleware first
setupSession(app);

// CORS middleware for mobile app compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://the-mom-app.replit.app',
    'https://app.themom.app',
    'https://themom.app',
    'https://login.themom.app',
    'http://localhost:5000',
    'http://localhost:5173',
    'capacitor://localhost',
    'https://localhost',
    'http://localhost'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin, User-Agent');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  
  // Add mobile-specific headers
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// JWT-to-session middleware: automatically set session userId from JWT token
// This ensures all endpoints work with token-based auth from the native mobile app
app.use(async (req, res, next) => {
  if (!req.session.userId && req.path.startsWith('/api')) {
    const token = extractTokenFromRequest(req);
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await storage.getUserById(decoded.userId);
        if (user) {
          req.session.userId = user.id;
        }
      }
    }
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  initializeFirebase();
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
