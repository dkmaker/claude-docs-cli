import { describe, expect, it, vi } from 'vitest';
import { logError, logInfo, logSuccess, logWarn } from '../../src/lib/logger.js';

describe('Logger', () => {
  it('logInfo should include INFO label', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logInfo('test message');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('INFO'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));
    consoleSpy.mockRestore();
  });

  it('logSuccess should include SUCCESS label', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logSuccess('test message');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SUCCESS'));
    consoleSpy.mockRestore();
  });

  it('logWarn should include WARN label', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logWarn('test message');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('WARN'));
    consoleSpy.mockRestore();
  });

  it('logError should include ERROR label and exit', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    logError('test message');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
    expect(exitSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
