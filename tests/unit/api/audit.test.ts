import { describe, it, expect, vi } from 'vitest';
import { createAuditLog, AUDIT_ACTIONS } from '../../../server/audit';
import { db } from '../../../server/db';
import { auditLogs } from '@shared/schema';

vi.mock('../../../server/db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue({ id: 1 })
  }
}));

describe('API: Audit Logging', () => {
  it('should define all required audit actions', () => {
    expect(AUDIT_ACTIONS.PATIENT_VIEW).toBeDefined();
    expect(AUDIT_ACTIONS.NOTE_CREATE).toBeDefined();
  });

  it('should call db.insert with correct parameters', async () => {
    const logData = {
      userId: 1,
      action: AUDIT_ACTIONS.PATIENT_VIEW,
      resource: 'patient',
      resourceId: 1,
      ipAddress: '127.0.0.1'
    };
    
    await createAuditLog(logData);
    
    expect(db.insert).toHaveBeenCalledWith(auditLogs);
    expect(db.insert(auditLogs).values).toHaveBeenCalledWith(expect.objectContaining({
      userId: logData.userId,
      action: logData.action,
      resource: logData.resource
    }));
  });
});
