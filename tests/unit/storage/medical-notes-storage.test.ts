import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../server/mock-storage';

describe('Storage: Medical Notes CRUD (MockStorage)', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should create and retrieve a medical note', async () => {
    const noteData = {
      patientId: 1,
      doctorId: 1,
      content: 'Soap content',
      type: 'soap',
      title: 'Initial Visit'
    };
    const note = await storage.createMedicalNote(noteData);
    expect(note).toHaveProperty('id');
    
    const fetched = await storage.getMedicalNote(note.id);
    expect(fetched?.title).toBe('Initial Visit');
  });

  it('should get notes by patient', async () => {
    await storage.createMedicalNote({ patientId: 1, doctorId: 1, content: 'C1', type: 'soap', title: 'T1' });
    await storage.createMedicalNote({ patientId: 1, doctorId: 1, content: 'C2', type: 'soap', title: 'T2' });
    
    const notes = await storage.getMedicalNotesByPatient(1);
    expect(notes.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle quick notes', async () => {
    const qNote = await storage.createQuickNote({
      doctorId: 1,
      content: 'Quick thought',
      title: 'Idea'
    });
    expect(qNote.isQuickNote).toBe(true);
    
    const quickNotes = await storage.getQuickNotes(1);
    expect(quickNotes.some(n => n.id === qNote.id)).toBe(true);
  });
});
