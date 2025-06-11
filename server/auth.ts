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

const JWT_SECRET = process.env.JWT_SECRET || "fallback-jwt-secret-for-development";

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded;
  } catch (error) {
    return null;
  }
}

export function extractTokenFromRequest(req: Request): string | null {
  // Check Authorization header first (for API requests)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookies (for web requests)
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token') {
        return value;
      }
    }
  }
  
  return null;
}

export async function getCurrentUser(req: Request): Promise<User | null> {
  // Try token-based authentication first
  const token = extractTokenFromRequest(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      const user = await storage.getUserById(decoded.userId);
      return user || null;
    }
  }
  
  // Fallback to session-based authentication
  if (!req.session.userId) {
    return null;
  }
  
  const user = await storage.getUserById(req.session.userId);
  return user || null;
}