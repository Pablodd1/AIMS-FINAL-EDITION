import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../server/mock-storage';

describe('Storage: Invoice CRUD (MockStorage)', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should create and retrieve an invoice', async () => {
    const invoiceData = {
      patientId: 1,
      doctorId: 1,
      amount: 5000,
      status: 'unpaid' as const,
      dueDate: new Date(),
      description: 'Test Invoice',
      invoiceNumber: 'INV-101'
    };
    const invoice = await storage.createInvoice(invoiceData);
    expect(invoice).toHaveProperty('id');
    
    const fetched = await storage.getInvoice(invoice.id);
    expect(fetched?.invoiceNumber).toBe('INV-101');
  });

  it('should get invoices by doctor', async () => {
    await storage.createInvoice({ patientId: 1, doctorId: 1, amount: 1000, status: 'unpaid', dueDate: new Date(), description: 'D1', invoiceNumber: 'I1' });
    const invoices = await storage.getInvoices(1);
    expect(invoices.length).toBeGreaterThanOrEqual(1);
  });

  it('should update invoice status', async () => {
    const inv = await storage.createInvoice({ patientId: 1, doctorId: 1, amount: 1000, status: 'unpaid', dueDate: new Date(), description: 'D1', invoiceNumber: 'I1' });
    const updated = await storage.updateInvoiceStatus(inv.id, 'paid');
    expect(updated?.status).toBe('paid');
  });

  it('should update invoice payment', async () => {
    const inv = await storage.createInvoice({ patientId: 1, doctorId: 1, amount: 1000, status: 'unpaid', dueDate: new Date(), description: 'D1', invoiceNumber: 'I1' });
    const updated = await storage.updateInvoicePayment(inv.id, 500);
    expect(updated?.amountPaid).toBe(500);
  });
});
