import { describe, it, expect } from 'vitest';
import { generateJwt, hashPassword, comparePasswords } from '../../../server/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "aims-default-secret-change-in-production";

describe('API: Auth Helpers', () => {
  it('should generate a valid JWT', () => {
    const user = {
      id: 1,
      username: 'testuser',
      role: 'doctor' as const,
      name: 'Test Doctor'
    };
    const token = generateJwt(user as any);
    expect(token).toBeDefined();
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    expect(decoded.id).toBe(user.id);
    expect(decoded.username).toBe(user.username);
    expect(decoded.role).toBe(user.role);
  });

  it('should hash and compare passwords correctly', async () => {
    const password = 'mySecretPassword';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(await comparePasswords(password, hash)).toBe(true);
    expect(await comparePasswords('wrongpassword', hash)).toBe(false);
  });

  it('should handle malformed hashes in comparePasswords', async () => {
    expect(await comparePasswords('pw', 'not-a-hash')).toBe(false);
    expect(await comparePasswords('pw', '')).toBe(false);
  });
});
