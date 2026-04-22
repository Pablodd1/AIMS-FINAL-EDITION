import { describe, it, expect } from 'vitest';
import { insertDeviceSchema, insertBpReadingSchema, insertGlucoseReadingSchema } from '../../../shared/schema';

describe('Schema: Device & Monitoring Validation', () => {
  it('should accept valid device data', () => {
    const validDevice = {
      patientId: 1,
      name: 'Home Monitor',
      type: 'bp' as const,
      model: 'Omron X7',
      status: 'disconnected' as const
    };
    const result = insertDeviceSchema.safeParse(validDevice);
    expect(result.success).toBe(true);
  });

  it('should accept valid BP reading data', () => {
    const validBp = {
      deviceId: 1,
      patientId: 1,
      systolic: 120,
      diastolic: 80,
      pulse: 72,
      notes: 'Feeling fine'
    };
    const result = insertBpReadingSchema.safeParse(validBp);
    expect(result.success).toBe(true);
  });

  it('should accept valid Glucose reading data', () => {
    const validGlucose = {
      deviceId: 2,
      patientId: 1,
      value: 95,
      type: 'fasting' as const,
      notes: 'Before breakfast'
    };
    const result = insertGlucoseReadingSchema.safeParse(validGlucose);
    expect(result.success).toBe(true);
  });

  it('should reject invalid device type', () => {
    const invalidDevice = {
      patientId: 1,
      name: 'Monitor',
      type: 'invalid-type',
      model: 'Model'
    };
    const result = insertDeviceSchema.safeParse(invalidDevice);
    expect(result.success).toBe(false);
  });
});
