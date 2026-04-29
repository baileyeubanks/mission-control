import { describe, expect, it } from 'vitest';
import { hasEnvKey, normalizeTwilioPayload } from '../src/lib/server-utils';

describe('normalizeTwilioPayload', () => {
  it('returns null when request body is missing', () => {
    expect(normalizeTwilioPayload(null)).toBeNull();
    expect(normalizeTwilioPayload('bad')).toBeNull();
  });

  it('trims and normalizes to/message and keeps a bounded message length', () => {
    const payload = normalizeTwilioPayload({
      to: ' +15550123456 ',
      message: '  hello world  ',
      from: '  +15551234567  ',
    });

    expect(payload).toEqual({
      to: '+15550123456',
      message: 'hello world',
      from: '+15551234567',
    });
  });

  it('returns null when required fields are missing', () => {
    expect(normalizeTwilioPayload({ to: ' +1', message: '   ' })).toBeNull();
    expect(normalizeTwilioPayload({ to: '  ', message: 'test' })).toBeNull();
  });

  it('enforces hard message cap while preserving text start', () => {
    const huge = `${'a'.repeat(5100)}`;
    const payload = normalizeTwilioPayload({ to: '+15550123456', message: huge });

    expect(payload).not.toBeNull();
    expect(payload?.message.length).toBe(5000);
    expect(payload?.message.startsWith('aa')).toBe(true);
  });
});

describe('hasEnvKey', () => {
  it('returns true only for non-empty trimmed env values', () => {
    process.env.TEST_PRESENT_KEY = ' enabled ';
    process.env.TEST_EMPTY_KEY = '   ';
    delete process.env.TEST_MISSING_KEY;

    expect(hasEnvKey('TEST_PRESENT_KEY')).toBe(true);
    expect(hasEnvKey('TEST_EMPTY_KEY')).toBe(false);
    expect(hasEnvKey('TEST_MISSING_KEY')).toBe(false);
  });
});
