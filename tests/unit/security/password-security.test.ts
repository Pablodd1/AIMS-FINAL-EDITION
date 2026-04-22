import { describe, it, expect } from 'vitest';
import { hashPassword } from '../../../server/auth';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Local implementation of compare logic to verify hashPassword output
async function verifyPassword(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

describe('Security: Password Hashing', () => {
  it('should produce a valid hash string with salt', async () => {
    const password = 'Password123!';
    const hash = await hashPassword(password);
    
    expect(hash).toContain('.');
    const [hashed, salt] = hash.split('.');
    expect(hashed.length).toBeGreaterThan(32);
    expect(salt.length).toBe(32); // 16 bytes random hex
  });

  it('should produce different hashes for the same password (salting)', async () => {
    const password = 'samepassword';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2);
  });

  it('should correctly verify a valid password', async () => {
    const password = 'securepassword';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should fail verification for a wrong password', async () => {
    const password = 'securepassword';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('wrongpassword', hash);
    expect(isValid).toBe(false);
  });
});
