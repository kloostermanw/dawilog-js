import { describe, it, expect } from 'vitest';
import { parseDsn } from './dsn';

const VALID = 'log.dawi.dev:550e8400-e29b-41d4-a716-446655440000:acme:web-app';

describe('parseDsn', () => {
  it('parses a valid DSN into parts and endpoint URL', () => {
    const result = parseDsn(VALID);
    expect(result).toEqual({
      hostname: 'log.dawi.dev',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      account: 'acme',
      project: 'web-app',
      endpointUrl:
        'https://log.dawi.dev/dwlog/event/acme/web-app/550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('returns null when a part is missing', () => {
    expect(parseDsn('log.dawi.dev:uuid:acme')).toBeNull();
  });

  it('returns null for an invalid uuid', () => {
    expect(parseDsn('log.dawi.dev:not-a-uuid:acme:web-app')).toBeNull();
  });

  it('returns null for an empty part', () => {
    expect(parseDsn('log.dawi.dev::acme:web-app')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(parseDsn(undefined as unknown as string)).toBeNull();
  });
});
