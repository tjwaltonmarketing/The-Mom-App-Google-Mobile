import bcrypt from "bcryptjs";
import session from "express-session";
import { Request, Response, NextFunction, Express } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export function setupSession(app: Express) {
  app.use(session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key-for-development",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function getCurrentUser(req: Request): Promise<User | null> {
  if (!req.session.userId) {
    return null;
  }
  
  const user = await storage.getUserById(req.session.userId);
  return user || null;
}