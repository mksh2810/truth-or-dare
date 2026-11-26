import { describe, expect, it, afterEach } from 'vitest';
import { getHealthPayload } from './health';

describe('api/health', () => {
  const originalPrivateBeta = process.env.PRIVATE_BETA;

  afterEach(() => {
    if (originalPrivateBeta === undefined) {
      delete process.env.PRIVATE_BETA;
    } else {
      process.env.PRIVATE_BETA = originalPrivateBeta;
    }
  });

  it('returns ok and service name with privateBeta false by default', () => {
    delete process.env.PRIVATE_BETA;
    expect(getHealthPayload()).toEqual({
      ok: true,
      service: 'vowlet-api',
      privateBeta: false,
    });
  });

  it('reflects PRIVATE_BETA=true', () => {
    process.env.PRIVATE_BETA = 'true';
    expect(getHealthPayload()).toEqual({
      ok: true,
      service: 'vowlet-api',
      privateBeta: true,
    });
  });
});
