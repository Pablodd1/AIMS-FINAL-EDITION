import { describe, it, expect } from 'vitest';
import { insertPatientSchema } from '../../../shared/schema';

describe('Schema: Patient Validation', () => {
  it('should accept valid patient data', () => {
    const validPatient = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '123-456-7890',
      dateOfBirth: '1990-01-01',
      address: '123 Main St',
      medicalHistory: 'None'
    };
    const result = insertPatientSchema.safeParse(validPatient);
    expect(result.success).toBe(true);
  });

  it('should reject empty firstName', () => {
    const invalidPatient = {
      firstName: '',
      email: 'jane@example.com'
    };
    const result = insertPatientSchema.safeParse(invalidPatient);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const invalidPatient = {
      firstName: 'Jane',
      email: 'invalid-email'
    };
    const result = insertPatientSchema.safeParse(invalidPatient);
    expect(result.success).toBe(false);
  });

  it('should accept minimal patient data', () => {
    const minimalPatient = {
      firstName: 'Jane',
      email: 'jane@example.com'
    };
    const result = insertPatientSchema.safeParse(minimalPatient);
    expect(result.success).toBe(true);
  });
});
