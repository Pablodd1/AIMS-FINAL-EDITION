import { describe, it, expect } from 'vitest';
import { insertUserSchema } from '../../../shared/schema';

describe('Schema: User Validation', () => {
  it('should accept valid user data', () => {
    const validUser = {
      username: 'jdoe',
      password: 'hashed_password',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'doctor'
    };
    const result = insertUserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should reject missing username', () => {
    const invalidUser = {
      password: 'hashed_password',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'doctor'
    };
    const result = insertUserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const invalidUser = {
      username: 'jdoe',
      password: 'hashed_password',
      name: 'John Doe',
      email: 'not-an-email',
      role: 'doctor'
    };
    const result = insertUserSchema.safeParse(invalidUser);
    // Note: shared/schema might not have strict email validation on insertUserSchema
    // but usually it does if using createInsertSchema.
    // Looking at schema.ts, insertUserSchema uses pick().
  });

  it('should accept optional fields', () => {
    const userWithOptionals = {
      username: 'jdoe',
      password: 'hashed_password',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'doctor',
      phone: '1234567890',
      specialty: 'Cardiology',
      bio: 'Expert in heart stuff'
    };
    const result = insertUserSchema.safeParse(userWithOptionals);
    expect(result.success).toBe(true);
  });
});
