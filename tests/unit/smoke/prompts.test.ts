import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPTS } from '../../../server/prompts';

describe('Smoke Test: System Prompts', () => {
  it('should contain SOAP_NOTE prompt with required sections', () => {
    const prompt = SYSTEM_PROMPTS.SOAP_NOTE;
    expect(prompt).toContain('SUBJECTIVE');
    expect(prompt).toContain('OBJECTIVE');
    expect(prompt).toContain('ASSESSMENT');
    expect(prompt).toContain('PLAN');
    expect(prompt).toContain('BILLING & CODING');
  });

  it('should contain LAB_INTERPRETER prompt', () => {
    expect(SYSTEM_PROMPTS.LAB_INTERPRETER).toContain('Functional Medicine Pathologist');
  });

  it('should contain INTAKE_SUMMARY prompt', () => {
    expect(SYSTEM_PROMPTS.INTAKE_SUMMARY).toContain('Senior Medical Scribe');
  });
});
