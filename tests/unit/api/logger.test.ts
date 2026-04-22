import { describe, it, expect, vi } from 'vitest';
import { log, logError, logger } from '../../../server/logger';

describe('API: Logger', () => {
  it('log should call winston logger.info', () => {
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger);
    log('Test message', { key: 'value' });
    expect(infoSpy).toHaveBeenCalledWith('Test message', { key: 'value' });
    infoSpy.mockRestore();
  });

  it('logError should call winston logger.error', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    logError('Error message', new Error('Fail'), { context: 'test' });
    expect(errorSpy).toHaveBeenCalledWith('Error message', expect.objectContaining({ context: 'test' }));
    errorSpy.mockRestore();
  });
});
