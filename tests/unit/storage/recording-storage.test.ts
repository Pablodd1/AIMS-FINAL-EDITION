import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../server/mock-storage';

describe('Storage: Recording Session CRUD (MockStorage)', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should create and retrieve a recording session', async () => {
    const sessionData = {
      doctorId: 1,
      patientId: 1,
      roomId: 'room-abc',
      status: 'active'
    };
    const session = await storage.createRecordingSession(sessionData);
    expect(session).toHaveProperty('id');
    
    const fetched = await storage.getRecordingSession(session.id);
    expect(fetched?.roomId).toBe('room-abc');
  });

  it('should get session by roomId', async () => {
    await storage.createRecordingSession({ doctorId: 1, roomId: 'room-123', status: 'active' });
    const session = await storage.getRecordingSessionByRoomId('room-123');
    expect(session).toBeDefined();
    expect(session?.roomId).toBe('room-123');
  });

  it('should update a recording session', async () => {
    const session = await storage.createRecordingSession({ doctorId: 1, roomId: 'r1', status: 'active' });
    const updated = await storage.updateRecordingSession(session.id, { status: 'completed', transcript: 'Transcribed text' });
    expect(updated?.status).toBe('completed');
    expect(updated?.transcript).toBe('Transcribed text');
  });

  it('should delete a recording session', async () => {
    const session = await storage.createRecordingSession({ doctorId: 1, roomId: 'r1', status: 'active' });
    const deleted = await storage.deleteRecordingSession(session.id);
    expect(deleted).toBe(true);
    
    const fetched = await storage.getRecordingSession(session.id);
    expect(fetched).toBeUndefined();
  });
});
