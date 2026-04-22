import { describe, it, expect } from 'vitest';
import { 
  insertMedicalNoteTemplateSchema,
  insertConsultationNoteSchema,
  insertAlertSettingSchema,
  insertLabKnowledgeBaseSchema,
  insertLabInterpreterSettingsSchema,
  insertLabReportSchema
} from '../../../shared/schema';

describe('Validation Schemas (Extended)', () => {
  it('insertMedicalNoteTemplateSchema should validate correct data', () => {
    const data = {
      title: 'Standard SOAP',
      type: 'soap' as const,
      template: 'Subjective: ... Objective: ...',
      systemPrompt: 'You are a helpful medical assistant...'
    };
    const result = insertMedicalNoteTemplateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('insertConsultationNoteSchema should validate correct data', () => {
    const data = {
      patientId: 1,
      doctorId: 1,
      transcript: 'Full transcript here...',
      recordingMethod: 'live-recording',
      title: 'Consultation with Patient'
    };
    const result = insertConsultationNoteSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('insertAlertSettingSchema should validate correct data with thresholds JSON', () => {
    const data = {
      patientId: 1,
      deviceType: 'bp' as const,
      thresholds: { min: 60, max: 140 },
      enabled: true
    };
    const result = insertAlertSettingSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('insertLabKnowledgeBaseSchema should validate correct data', () => {
    const data = {
      userId: 1,
      test_name: 'Thyroid Panel',
      marker: 'HgbA1c',
      interpretation: 'Standard interpretation',
      normal_range_low: 4.0,
      normal_range_high: 5.6,
      unit: '%'
    };
    const result = insertLabKnowledgeBaseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('insertLabReportSchema should validate correct data', () => {
    const data = {
      patientId: 1,
      doctorId: 1,
      reportData: 'Raw data from lab...',
      title: 'Monthly Lab Report',
      analysis: 'All markers normal'
    };
    const result = insertLabReportSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
