import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../server/mock-storage';

describe('Storage: Settings & Email Templates CRUD (MockStorage)', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should handle general settings', async () => {
    await storage.saveSetting('site_name', 'AIMS Portal');
    const value = await storage.getSetting('site_name');
    expect(value).toBe('AIMS Portal');
    
    const settings = await storage.getSettings(['site_name', 'non_existent']);
    expect(settings['site_name']).toBe('AIMS Portal');
    expect(settings['non_existent']).toBeUndefined();
  });

  it('should handle system settings', async () => {
    await storage.setSystemSetting('maintenance_mode', 'true', 'Turn on maintenance');
    const value = await storage.getSystemSetting('maintenance_mode');
    expect(value).toBe('true');
  });

  it('should handle email templates', async () => {
    const template = await storage.saveEmailTemplate('welcome', '<h1>Welcome!</h1>');
    expect(template.type).toBe('welcome');
    
    const fetched = await storage.getEmailTemplate('welcome');
    expect(fetched?.content).toBe('<h1>Welcome!</h1>');
  });
});
