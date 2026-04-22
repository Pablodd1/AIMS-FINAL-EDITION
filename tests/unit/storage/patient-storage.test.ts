import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../server/mock-storage';

describe('Storage: Patient CRUD (MockStorage)', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should create and retrieve a patient', async () => {
    const patientData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
      phone: '555-1212',
      createdBy: 1
    };
    const patient = await storage.createPatient(patientData);
    expect(patient).toHaveProperty('id');
    expect(patient.firstName).toBe('John');

    const fetched = await storage.getPatient(patient.id);
    expect(fetched).toEqual(patient);
  });

  it('should list patients with doctorId filter', async () => {
    await storage.createPatient({ firstName: 'P1', email: 'p1@e.com', createdBy: 1 });
    await storage.createPatient({ firstName: 'P2', email: 'p2@e.com', createdBy: 2 });
    
    const doc1Patients = await storage.getPatients(1);
    expect(doc1Patients.length).toBeGreaterThanOrEqual(1);
    expect(doc1Patients.every(p => p.createdBy === 1)).toBe(true);
  });

  it('should handle pagination', async () => {
    for (let i = 0; i < 15; i++) {
      await storage.createPatient({ firstName: `Patient ${i}`, email: `p${i}@e.com`, createdBy: 1 });
    }
    
    const page1 = await storage.getPatients(1, 10, 0);
    expect(page1.length).toBe(10);
    
    const page2 = await storage.getPatients(1, 10, 10);
    expect(page2.length).toBeGreaterThanOrEqual(5);
  });

});
