import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../server/mock-storage';

describe('Storage: Patient Extended Data CRUD (MockStorage)', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should handle medical alerts', async () => {
    const alert = await storage.createMedicalAlert({
      patientId: 1,
      type: 'allergy',
      severity: 'high',
      title: 'Peanut Allergy'
    });
    expect(alert).toHaveProperty('id');
    
    const alerts = await storage.getMedicalAlertsByPatient(1);
    expect(alerts.some(a => a.id === alert.id)).toBe(true);
    
    await storage.deleteMedicalAlert(alert.id);
    const afterDelete = await storage.getMedicalAlertsByPatient(1);
    expect(afterDelete.some(a => a.id === alert.id)).toBe(false);
  });

  it('should handle patient activity', async () => {
    const activity = await storage.createPatientActivity({
      patientId: 1,
      activityType: 'appointment',
      title: 'Initial Checkup',
      createdBy: 1
    });
    expect(activity).toHaveProperty('id');
    
    const activities = await storage.getPatientActivity(1);
    expect(activities.some(a => a.id === activity.id)).toBe(true);
  });

  it('should handle prescriptions', async () => {
    const rx = await storage.createPrescription({
      patientId: 1,
      medicationName: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'BID',
      status: 'active'
    });
    expect(rx).toHaveProperty('id');
    
    const rxs = await storage.getPrescriptionsByPatient(1);
    expect(rxs.some(r => r.id === rx.id)).toBe(true);
  });

  it('should handle medical history entries', async () => {
    const entry = await storage.createMedicalHistoryEntry({
      patientId: 1,
      category: 'condition',
      title: 'Hypertension',
      createdBy: 1
    });
    expect(entry).toHaveProperty('id');
    
    const history = await storage.getMedicalHistoryEntriesByPatient(1);
    expect(history.some(h => h.id === entry.id)).toBe(true);
  });
});
