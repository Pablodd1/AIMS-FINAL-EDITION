import { describe, it, expect } from 'vitest';
import { insertMedicalNoteSchema } from '../../../shared/schema';

describe('Schema: Medical Note Validation', () => {
  it('should accept valid medical note data', () => {
    const validNote = {
      patientId: 1,
      doctorId: 1,
      content: 'Patient is doing well.',
      type: 'soap',
      title: 'Monthly Review'
    };
    const result = insertMedicalNoteSchema.safeParse(validNote);
    expect(result.success).toBe(true);
  });

  it('should reject missing content', () => {
    const invalidNote = {
      patientId: 1,
      doctorId: 1,
      title: 'Monthly Review'
    };
    const result = insertMedicalNoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject invalid note type', () => {
    const invalidNote = {
      patientId: 1,
      doctorId: 1,
      content: 'Some content',
      type: 'invalid-type',
      title: 'Title'
    };
    const result = insertMedicalNoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });
});
