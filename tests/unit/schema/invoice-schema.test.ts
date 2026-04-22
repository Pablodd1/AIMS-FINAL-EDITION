import { describe, it, expect } from 'vitest';
import { insertInvoiceSchema } from '../../../shared/schema';

describe('Schema: Invoice Validation', () => {
  it('should accept valid invoice data', () => {
    const validInvoice = {
      patientId: 1,
      doctorId: 1,
      amount: 10000, // $100.00
      amountPaid: 0,
      status: 'unpaid',
      dueDate: '2026-12-31',
      description: 'Consultation Fee',
      invoiceNumber: 'INV-001'
    };
    const result = insertInvoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it('should reject missing amount', () => {
    const invalidInvoice = {
      patientId: 1,
      doctorId: 1,
      dueDate: '2026-12-31',
      description: 'Consultation Fee',
      invoiceNumber: 'INV-001'
    };
    const result = insertInvoiceSchema.safeParse(invalidInvoice);
    expect(result.success).toBe(false);
  });

  it('should transform Date object to string for dueDate if needed', () => {
     const invoiceWithDateObj = {
      patientId: 1,
      doctorId: 1,
      amount: 10000,
      amountPaid: 0,
      status: 'unpaid' as const,
      dueDate: new Date('2026-12-31'),
      description: 'Consultation Fee',
      invoiceNumber: 'INV-001'
    };
    const result = insertInvoiceSchema.safeParse(invoiceWithDateObj);
    expect(result.success).toBe(true);
    if (result.success) {
        expect(result.data.dueDate).toBe('2026-12-31');
    }
  });
});
