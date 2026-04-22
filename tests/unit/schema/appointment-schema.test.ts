import { describe, it, expect } from 'vitest';
import { insertAppointmentSchema } from '../../../shared/schema';

describe('Schema: Appointment Validation', () => {
  it('should accept valid appointment data', () => {
    const validAppointment = {
      patientId: 1,
      doctorId: 1,
      date: new Date(),
      type: 'in-person',
      reason: 'Regular checkup',
      notes: 'No issues'
    };
    const result = insertAppointmentSchema.safeParse(validAppointment);
    expect(result.success).toBe(true);
  });

  it('should reject missing patientId', () => {
    const invalidAppointment = {
      doctorId: 1,
      date: new Date().toISOString()
    };
    const result = insertAppointmentSchema.safeParse(invalidAppointment);
    expect(result.success).toBe(false);
  });

  it('should reject missing date', () => {
    const invalidAppointment = {
      patientId: 1,
      doctorId: 1
    };
    const result = insertAppointmentSchema.safeParse(invalidAppointment);
    expect(result.success).toBe(false);
  });
});
