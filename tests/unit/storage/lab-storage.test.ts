import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../server/mock-storage';

describe('Storage: Lab Interpreter CRUD (MockStorage)', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should handle lab knowledge base items', async () => {
    const itemData = {
      userId: 1,
      marker: 'TSH',
      category: 'Thyroid',
      description: 'Thyroid Stimulating Hormone',
      normal_range_low: 0.4,
      normal_range_high: 4.0,
      unit: 'mIU/L',
      functional_range_low: 1.0,
      functional_range_high: 2.0,
      recommendations: 'Check T3/T4'
    };
    const item = await storage.createLabKnowledgeBaseItem(itemData);
    expect(item).toHaveProperty('id');
    
    const fetched = await storage.getLabKnowledgeBaseItem(item.id);
    expect(fetched?.marker).toBe('TSH');
    
    const items = await storage.getLabKnowledgeBase();
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle lab interpreter settings', async () => {
    const settingsData = {
      with_patient_prompt: 'Test prompt',
      without_patient_prompt: 'Another prompt',
      report_format_instructions: 'Format here'
    };
    const settings = await storage.saveLabInterpreterSettings(settingsData);
    expect(settings).toHaveProperty('id');
    
    const fetched = await storage.getLabInterpreterSettings();
    expect(fetched?.with_patient_prompt).toBe('Test prompt');
  });

  it('should handle lab reports', async () => {
    const reportData = {
      doctorId: 1,
      patientId: 1,
      reportDate: new Date(),
      status: 'pending',
      summary: 'Initial report'
    };
    const report = await storage.createLabReport(reportData);
    expect(report).toHaveProperty('id');
    
    const fetched = await storage.getLabReport(report.id);
    expect(fetched?.summary).toBe('Initial report');
    
    const reports = await storage.getLabReports(1);
    expect(reports.length).toBeGreaterThanOrEqual(1);
  });
});
