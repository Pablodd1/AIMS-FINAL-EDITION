import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../server/mock-storage';

describe('Storage: Appointment CRUD (MockStorage)', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should create and retrieve an appointment', async () => {
    const appointmentData = {
      patientId: 1,
      doctorId: 1,
      date: new Date(),
      status: 'scheduled',
      type: 'in-person',
      reason: 'Checkup'
    };
    const appointment = await storage.createAppointment(appointmentData);
    expect(appointment).toHaveProperty('id');
    
    const fetched = await storage.getAppointment(appointment.id);
    expect(fetched?.reason).toBe('Checkup');
  });

  it('should get appointments by doctor', async () => {
    await storage.createAppointment({ patientId: 1, doctorId: 1, date: new Date(), status: 'scheduled' });
    await storage.createAppointment({ patientId: 2, doctorId: 1, date: new Date(), status: 'scheduled' });
    await storage.createAppointment({ patientId: 1, doctorId: 2, date: new Date(), status: 'scheduled' });
    
    const doc1Apps = await storage.getAppointments(1);
    expect(doc1Apps.length).toBeGreaterThanOrEqual(2);
  });

  it('should update appointment status', async () => {
    const app = await storage.createAppointment({ patientId: 1, doctorId: 1, date: new Date(), status: 'scheduled' });
    const updated = await storage.updateAppointmentStatus(app.id, 'completed');
    expect(updated?.status).toBe('completed');
  });

  it('should delete an appointment', async () => {
    const app = await storage.createAppointment({ patientId: 1, doctorId: 1, date: new Date(), status: 'scheduled' });
    const deleted = await storage.deleteAppointment(app.id);
    expect(deleted).toBe(true);
  });
});
