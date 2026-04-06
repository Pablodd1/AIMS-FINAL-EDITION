import { db } from './db';
import { auditLogs, type InsertAuditLog } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export interface AuditLogParams {
  userId?: number;
  action: string;
  resource: string;
  resourceId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const createAuditLog = async (params: AuditLogParams): Promise<void> => {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId ?? null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

export const getAuditLogs = async (limit: number = 100) => {
  return db.select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
};

export const getAuditLogsByUser = async (userId: number, limit: number = 100) => {
  return db.select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
};

export const getAuditLogsByResource = async (resource: string, resourceId: number, limit: number = 100) => {
  return db.select()
    .from(auditLogs)
    .where(eq(auditLogs.resourceId, resourceId))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
};

export const getAuditLogsByAction = async (action: string, limit: number = 100) => {
  return db.select()
    .from(auditLogs)
    .where(eq(auditLogs.action, action))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
};

export const AUDIT_ACTIONS = {
  PATIENT_VIEW: 'patient.view',
  PATIENT_CREATE: 'patient.create',
  PATIENT_UPDATE: 'patient.update',
  PATIENT_DELETE: 'patient.delete',
  NOTE_VIEW: 'note.view',
  NOTE_CREATE: 'note.create',
  NOTE_UPDATE: 'note.update',
  NOTE_DELETE: 'note.delete',
  PRESCRIPTION_VIEW: 'prescription.view',
  PRESCRIPTION_CREATE: 'prescription.create',
  PRESCRIPTION_UPDATE: 'prescription.update',
  PRESCRIPTION_DELETE: 'prescription.delete',
  DEVICE_CONNECT: 'device.connect',
  DEVICE_DISCONNECT: 'device.disconnect',
  READING_CREATE: 'reading.create',
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  EXPORT: 'data.export',
  REPORT_GENERATE: 'report.generate',
};
