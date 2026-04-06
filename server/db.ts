import { Pool } from 'pg';
import { log, logError } from './logger';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  logError("WARNING: DATABASE_URL is not set. Database features will be unavailable.");
}

const rawDbUrl = process.env.DATABASE_URL || "";
let dbUrl = rawDbUrl;

// Sanitize: Remove 'psql' command wrapper if user copied from Neon's CLI tab by mistake
// This handles format: psql 'postgresql://user:pass@host/db?sslmode=require'
if (dbUrl.includes("psql '")) {
  const match = dbUrl.match(/'([^']+)'/);
  if (match && match[1]) {
    dbUrl = match[1];
    log('ℹ️ Sanitized DATABASE_URL (removed psql wrapper)');
  }
}

// Handle another common mistake: just the URL inside quotes
if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
  dbUrl = dbUrl.slice(1, -1);
}

// Fallback to dummy for dev if absolutely nothing provided
if (!dbUrl && process.env.NODE_ENV !== 'production') {
  dbUrl = "postgresql://pseudo:pseudo@localhost:5432/pseudo";
}

// Use standard PostgreSQL connection instead of Neon serverless to avoid WebSocket issues
export const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.DATABASE_URL && process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Add pool error handling
pool.on('error', (err) => {
  logError('Pool error:', err);
});

export const db = drizzle(pool, { schema });