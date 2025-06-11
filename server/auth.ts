import bcrypt from "bcryptjs";
import session from "express-session";
import MemoryStore from "memorystore";
import { Request, Response, NextFunction, Express } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import jwt from "jsonwebtoken";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export function setupSession(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  const MemoryStoreSession = MemoryStore(session);
  
  app.use(session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key-for-development",
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: true, // Create session for mobile apps
    cookie: {
      secure: false, // Keep false for mobile apps
      httpOnly: false, // Allow client access for mobile apps
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax', // Important for mobile/cross-origin
    },
    name: 'momapp.sid', // Custom session name
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