import { Express } from "express";
import { createServer } from "http";

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

  return server;
}