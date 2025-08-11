import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

// Simple database configuration with minimal setup
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Create a simple connection pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Initialize database
export const db = drizzle({ client: pool });

// Simple test function
export async function testDbConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}