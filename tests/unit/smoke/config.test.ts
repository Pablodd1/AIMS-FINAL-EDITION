import { describe, it, expect } from 'vitest';
import { CONFIG, SECURITY_CONFIG, DEMO_USERS, validateConfig } from '../../../server/config';

describe('Smoke Test: Configuration', () => {
  it('should have all required keys in CONFIG', () => {
    expect(CONFIG).toHaveProperty('DATABASE_URL');
    expect(CONFIG).toHaveProperty('SESSION_SECRET');
    expect(CONFIG).toHaveProperty('JWT_SECRET');
    expect(CONFIG).toHaveProperty('PORT');
    expect(CONFIG).toHaveProperty('NODE_ENV');
  });

  it('should validateConfig without throwing in development', () => {
    expect(() => validateConfig()).not.toThrow();
  });

  it('should have a valid SECURITY_CONFIG', () => {
    expect(SECURITY_CONFIG).toHaveProperty('helmet');
    expect(SECURITY_CONFIG).toHaveProperty('rateLimit');
    expect(SECURITY_CONFIG).toHaveProperty('cors');
    
    expect(SECURITY_CONFIG.helmet.contentSecurityPolicy.directives.objectSrc).toContain("'none'");
    expect(SECURITY_CONFIG.helmet.contentSecurityPolicy.directives.frameSrc).toContain("'none'");
  });

  it('should have valid DEMO_USERS', () => {
    expect(DEMO_USERS).toHaveProperty('administrator');
    expect(DEMO_USERS).toHaveProperty('doctor');
    expect(DEMO_USERS).toHaveProperty('patient');
    
    expect(DEMO_USERS.administrator.role).toBe('administrator');
  });

  it('should have a default PORT of 5000 if not specified', () => {
    // This assumes the environment variable is not set in the test environment or matches the default
    if (!process.env.PORT) {
      expect(CONFIG.PORT).toBe(5000);
    }
  });
});
