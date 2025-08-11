import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Node.js environment with better error handling
try {
  neonConfig.webSocketConstructor = ws;
  neonConfig.useSecureWebSocket = true;
  neonConfig.pipelineConnect = false;
  neonConfig.pipelineTLS = false;
  
  // Add connection retry settings
  neonConfig.fetchConnectionCache = true;
  neonConfig.fetchFunction = fetch;
} catch (error) {
  console.warn("WebSocket configuration warning:", error);
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with improved settings for stability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1, // Limit concurrent connections for stability
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // Increased timeout
  maxUses: Infinity,
  allowExitOnIdle: false,
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

pool.on('connect', () => {
  console.log('Database connected successfully');
});

export const db = drizzle({ client: pool, schema });