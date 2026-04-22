import { describe, it, expect } from 'vitest';
import { insertIntakeFormSchema, insertIntakeFormResponseSchema } from '../../../shared/schema';

describe('Schema: Intake Form Validation', () => {
  it('should accept valid intake form data', () => {
    const validForm = {
      patientId: 1,
      doctorId: 1,
      status: 'pending',
      uniqueLink: 'abc-123-xyz',
      email: 'patient@example.com',
      phone: '123-456-7890',
      name: 'John Doe',
      expiresAt: new Date(Date.now() + 86400000)
    };
    const result = insertIntakeFormSchema.safeParse(validForm);
    expect(result.success).toBe(true);
  });

  it('should accept valid intake form response data', () => {
    const validResponse = {
      formId: 1,
      questionId: 'q1',
      question: 'What is your main concern?',
      answer: 'Back pain',
      answerType: 'text'
    };
    const result = insertIntakeFormResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should reject response with missing question', () => {
    const invalidResponse = {
      formId: 1,
      questionId: 'q1',
      answer: 'Back pain'
    };
    const result = insertIntakeFormResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});
