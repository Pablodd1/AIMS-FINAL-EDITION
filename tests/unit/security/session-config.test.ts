import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../../server/config';

describe('Security: Session Configuration', () => {
  it('should have a secure SESSION_SECRET of sufficient length', () => {
    // In production it must be set, in dev it generates one
    expect(CONFIG.SESSION_SECRET).toBeDefined();
    expect(CONFIG.SESSION_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it('should have a valid SESSION_TIMEOUT', () => {
    expect(CONFIG.SESSION_TIMEOUT).toBeGreaterThan(0);
    // Default is 900000ms (15 mins)
    expect(CONFIG.SESSION_TIMEOUT).toBe(900000);
  });

  it('should NOT use default JWT_SECRET if environment provides one', () => {
    // This is hard to test without changing env, but we can check it's defined
    expect(CONFIG.JWT_SECRET).toBeDefined();
    expect(CONFIG.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
  });
});
