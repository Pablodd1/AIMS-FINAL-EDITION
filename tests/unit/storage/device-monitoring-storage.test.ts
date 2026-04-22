import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../server/mock-storage';

describe('Storage: Device Monitoring CRUD (MockStorage)', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should handle devices', async () => {
    const deviceData = {
      patientId: 1,
      name: 'Monitor 1',
      type: 'bp' as const,
      model: 'Omron',
      status: 'active' as const
    };
    const device = await storage.createDevice(deviceData);
    expect(device).toHaveProperty('id');
    
    const fetched = await storage.getDevice(device.id);
    expect(fetched?.name).toBe('Monitor 1');
    
    const devices = await storage.getDevices(1);
    expect(devices.length).toBe(1);
  });

  it('should handle BP readings', async () => {
    const reading = await storage.createBpReading({
      deviceId: 1,
      patientId: 1,
      systolic: 120,
      diastolic: 80,
      pulse: 72
    });
    expect(reading).toHaveProperty('id');
    
    const readings = await storage.getBpReadings(1);
    expect(readings.length).toBe(1);
    expect(readings[0].systolic).toBe(120);
  });

  it('should handle Glucose readings', async () => {
    const reading = await storage.createGlucoseReading({
      deviceId: 2,
      patientId: 1,
      value: 100,
      type: 'fasting'
    });
    expect(reading).toHaveProperty('id');
    
    const readings = await storage.getGlucoseReadings(1);
    expect(readings.length).toBe(1);
    expect(readings[0].value).toBe(100);
  });

  it('should handle Alert settings', async () => {
    const settings = await storage.saveAlertSettings({
      patientId: 1,
      deviceType: 'bp',
      thresholds: {
        minSystolic: 90,
        maxSystolic: 140,
        minDiastolic: 60,
        maxDiastolic: 90
      },
      enabled: true,
      notifyPatient: true,
      notifyDoctor: true
    });
    expect(settings).toHaveProperty('id');
    
    const fetched = await storage.getAlertSettings(1, 'bp');
    expect((fetched?.thresholds as any).maxSystolic).toBe(140);
  });
});
