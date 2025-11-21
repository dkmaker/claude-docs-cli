import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectOutputMode, detectOutputModeWithSource } from '../../../src/utils/env.js';

describe('detectOutputMode', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.CLAUDECODE;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      process.env.CLAUDECODE = undefined;
    } else {
      process.env.CLAUDECODE = originalEnv;
    }
  });

  it('should return "ai" when CLAUDECODE=1', () => {
    process.env.CLAUDECODE = '1';
    expect(detectOutputMode()).toBe('ai');
  });

  it('should return "user" when CLAUDECODE is not set', () => {
    process.env.CLAUDECODE = undefined;
    expect(detectOutputMode()).toBe('user');
  });

  it('should return "user" when CLAUDECODE=0', () => {
    process.env.CLAUDECODE = '0';
    expect(detectOutputMode()).toBe('user');
  });

  it('should return "user" when CLAUDECODE is any value other than "1"', () => {
    process.env.CLAUDECODE = 'true';
    expect(detectOutputMode()).toBe('user');

    process.env.CLAUDECODE = 'yes';
    expect(detectOutputMode()).toBe('user');
  });
});

describe('detectOutputModeWithSource', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.CLAUDECODE;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      process.env.CLAUDECODE = undefined;
    } else {
      process.env.CLAUDECODE = originalEnv;
    }
  });

  it('should return ai mode with env source when CLAUDECODE=1', () => {
    process.env.CLAUDECODE = '1';
    const result = detectOutputModeWithSource();
    expect(result).toEqual({ mode: 'ai', source: 'env' });
  });

  it('should return user mode with default source when CLAUDECODE is not set', () => {
    process.env.CLAUDECODE = undefined;
    const result = detectOutputModeWithSource();
    expect(result).toEqual({ mode: 'user', source: 'default' });
  });

  it('should return user mode with default source when CLAUDECODE=0', () => {
    process.env.CLAUDECODE = '0';
    const result = detectOutputModeWithSource();
    expect(result).toEqual({ mode: 'user', source: 'default' });
  });
});
