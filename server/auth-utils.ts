import jwt from 'jsonwebtoken';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || "aims-default-secret-change-in-production";

/**
 * Get authenticated user from request — supports both JWT Bearer token and session auth.
 * Used by both error-handler.ts (requireAuth, requireAdmin, requireDoctor)
 * and auth.ts (jwtOrSessionAuth).
 *
 * Returns the user object if authenticated, null otherwise.
 * Does NOT call next() — caller is responsible for responding or calling next().
 */
export async function getAuthenticatedUserFromRequest(req: any): Promise<any> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await storage.getUser(decoded.id);
      if (user) {
        return user;
      }
    } catch {
      // JWT invalid or user not found — fall through
    }
  }
  // Fallback: session-based auth (Passport)
  if (req.isAuthenticated && req.isAuthenticated()) {
    return req.user;
  }
  return null;
}
