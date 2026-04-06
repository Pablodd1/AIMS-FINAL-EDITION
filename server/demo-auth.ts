/**
 * Demo Authentication Service
 * Provides secure demo user functionality with restrictions
 */

import { CONFIG, DEMO_USERS } from './config';
import crypto from 'crypto';

export interface DemoUser {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
  isDemo: boolean;
  permissions: string[];
  sessionExpiry?: number;
}

export interface DemoSession {
  user: DemoUser;
  token: string;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
}

class DemoAuthService {
  private sessions: Map<string, DemoSession> = new Map();
  private readonly SESSION_DURATION = CONFIG.DEMO_MODE.maxSessionTime; // 30 minutes
  private readonly MAX_SESSIONS = 10; // Prevent abuse

  constructor() {
    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Create a new demo session
   */
  createDemoSession(role: keyof typeof DEMO_USERS): DemoSession | null {
    if (!CONFIG.DEMO_MODE.enabled) {
      return null;
    }

    // Check session limit
    if (this.sessions.size >= this.MAX_SESSIONS) {
      this.cleanupExpiredSessions();
      if (this.sessions.size >= this.MAX_SESSIONS) {
        console.warn('Demo session limit reached');
        return null;
      }
    }

    const demoUser = DEMO_USERS[role];
    if (!demoUser) {
      console.error(`Invalid demo role: ${role}`);
      return null;
    }

    const now = Date.now();
    const session: DemoSession = {
      user: {
        ...demoUser,
        sessionExpiry: now + this.SESSION_DURATION
      },
      token: this.generateSecureToken(),
      createdAt: now,
      expiresAt: now + this.SESSION_DURATION,
      isActive: true
    };

    this.sessions.set(session.token, session);
    return session;
  }

  /**
   * Validate a demo session token
   */
  validateDemoSession(token: string): DemoUser | null {
    const session = this.sessions.get(token);
    
    if (!session || !session.isActive) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    return session.user;
  }

  /**
   * Check if a request is allowed for demo users
   */
  isRequestAllowed(path: string, method: string): boolean {
    if (!CONFIG.DEMO_MODE.enabled || !CONFIG.DEMO_MODE.restricted) {
      return true;
    }

    const allowedEndpoints = CONFIG.DEMO_MODE.allowedEndpoints;
    const isAllowed = allowedEndpoints.some(endpoint => {
      if (endpoint.includes('*')) {
        const pattern = endpoint.replace('*', '.*');
        return new RegExp(pattern).test(path);
      }
      return path.startsWith(endpoint);
    });

    // Additional restrictions for demo mode
    if (isAllowed) {
      // Block dangerous operations in demo mode
      const restrictedPaths = [
        '/api/delete',
        '/api/admin/delete',
        '/api/settings',
        '/api/billing',
        '/api/notifications/send'
      ];

      return !restrictedPaths.some(rp => path.includes(rp));
    }

    return false;
  }

  /**
   * Get demo session info
   */
  getDemoSessionInfo(token: string): Partial<DemoSession> | null {
    const session = this.sessions.get(token);
    if (!session) return null;

    return {
      user: session.user,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isActive: session.isActive
    };
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired demo sessions`);
    }
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get current session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (for testing/admin)
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }
}

// Export singleton instance
export const demoAuthService = new DemoAuthService();

// Helper functions
export function isDemoUser(user: any): boolean {
  return user && user.isDemo === true;
}

export function canAccessDemoFeature(path: string, method: string, user?: any): boolean {
  if (!user) return false;
  if (!isDemoUser(user)) return true; // Regular users have full access
  
  return demoAuthService.isRequestAllowed(path, method);
}