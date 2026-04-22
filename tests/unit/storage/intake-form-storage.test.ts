import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../server/mock-storage';

describe('Storage: Intake Form CRUD (MockStorage)', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should create and retrieve an intake form', async () => {
    const formData = {
      patientId: 1,
      doctorId: 1,
      status: 'pending',
      uniqueLink: 'link-123',
      email: 'p@e.com',
      name: 'P1'
    };
    const form = await storage.createIntakeForm(formData);
    expect(form).toHaveProperty('id');
    
    const fetched = await storage.getIntakeForm(form.id);
    expect(fetched?.uniqueLink).toBe('link-123');
  });

  it('should get form by unique link', async () => {
    await storage.createIntakeForm({ patientId: 1, doctorId: 1, uniqueLink: 'secret-link', email: 'p@e.com', name: 'P1' });
    const form = await storage.getIntakeFormByLink('secret-link');
    expect(form).toBeDefined();
    expect(form?.uniqueLink).toBe('secret-link');
  });

  it('should handle intake form responses', async () => {
    const form = await storage.createIntakeForm({ patientId: 1, doctorId: 1, uniqueLink: 'l1', email: 'p@e.com', name: 'P1' });
    const response = await storage.createIntakeFormResponse({
      formId: form.id,
      questionId: 'q1',
      question: 'How are you?',
      answer: 'Good',
      answerType: 'text'
    });
    expect(response).toHaveProperty('id');
    
    const responses = await storage.getIntakeFormResponses(form.id);
    expect(responses.length).toBe(1);
    expect(responses[0].answer).toBe('Good');
  });
});
