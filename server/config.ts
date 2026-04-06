/**
 * Secure Configuration Management
 * Handles sensitive environment variables and provides fallback defaults
 */

import { config } from 'dotenv';
import crypto from 'node:crypto';

// Load environment variables
config();

// Secure configuration with fallbacks
export const CONFIG = {
  // Database
  DATABASE_URL: (function() {
    let url = process.env.DATABASE_URL || '';
    if (url.includes("psql '")) {
      const match = url.match(/'([^']+)'/);
      if (match && match[1]) url = match[1];
    }
    if (url.startsWith('"') && url.endsWith('"')) {
      url = url.slice(1, -1);
    }
    return url;
  })(),
  
  // Security
  SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT || '900000', 10),
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  
  // AI Services (with secure defaults)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || '',
  KIMI_API_KEY: process.env.KIMI_API_KEY || '',
  
  // SMS Notifications
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  
  // Feature flags
  VITE_ENABLE_LOGIN_BYPASS: process.env.VITE_ENABLE_LOGIN_BYPASS === 'true',
  
  // Demo mode configuration
  DEMO_MODE: {
    enabled: process.env.VITE_ENABLE_LOGIN_BYPASS === 'true',
    restricted: true, // Demo users have restricted permissions
    maxSessionTime: 30 * 60 * 1000, // 30 minutes
    allowedEndpoints: ['/api/user', '/api/dashboard', '/api/patients', '/api/appointments'],
  }
};

// Validate required configuration
export function validateConfig(): void {
  const required = ['SESSION_SECRET', 'JWT_SECRET'];
  const missing = required.filter(key => !CONFIG[key as keyof typeof CONFIG]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing configuration for: ${missing.join(', ')}. Using generated secrets.`);
  }
  
  if (CONFIG.NODE_ENV === 'production') {
    if (!CONFIG.DATABASE_URL) {
      throw new Error('❌ DATABASE_URL is required in production');
    }
    if (!CONFIG.OPENAI_API_KEY) {
      console.warn('⚠️  OPENAI_API_KEY not configured - AI features disabled');
    }
  }
}

// Security headers configuration
export const SECURITY_CONFIG = {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'https://yourdomain.com'
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5000'],
    credentials: true,
  }
};

// Demo user configuration
export const DEMO_USERS = {
  administrator: {
    id: 'demo-admin',
    username: 'demo-admin',
    name: 'Demo Administrator',
    role: 'administrator',
    email: 'demo-admin@example.com',
    isDemo: true,
    permissions: ['read', 'write', 'admin']
  },
  doctor: {
    id: 'demo-doctor',
    username: 'demo-doctor',
    name: 'Demo Doctor',
    role: 'doctor',
    email: 'demo-doctor@example.com',
    isDemo: true,
    permissions: ['read', 'write']
  },
  patient: {
    id: 'demo-patient',
    username: 'demo-patient',
    name: 'Demo Patient',
    role: 'patient',
    email: 'demo-patient@example.com',
    isDemo: true,
    permissions: ['read']
  }
};

// Initialize configuration
validateConfig();