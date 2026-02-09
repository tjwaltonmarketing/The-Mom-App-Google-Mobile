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
    teenId?: number;
    inviteCode?: string;
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
    resave: false, // Only save if session modified
    saveUninitialized: false, // Don't create session until something stored
    rolling: true, // Reset maxAge on each request
    cookie: {
      secure: isProduction, // HTTPS only in production
      httpOnly: false, // Allow client access for mobile apps
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? 'none' : 'lax', // Cross-origin for mobile in production
    },
    name: 'connect.sid', // Standard session name for compatibility
  }));
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check session first
  if (req.session.userId) {
    return next();
  }
  
  // Try token-based authentication as fallback
  const token = extractTokenFromRequest(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      // Verify user exists
      const user = await storage.getUserById(decoded.userId);
      if (user) {
        // Set session for consistency
        req.session.userId = user.id;
        return next();
      }
    }
  }
  
  console.log("Auth failed - Session ID:", req.session?.id, "User ID:", req.session?.userId);
  return res.status(401).json({ message: "Unauthorized" });
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
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '90d' });
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