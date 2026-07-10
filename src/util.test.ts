import { describe, it, expect } from 'vitest';
import { toAtom, generateEventId } from './util';

describe('toAtom', () => {
  it('formats a date as strict ATOM UTC with no milliseconds and +00:00', () => {
    const d = new Date(Date.UTC(2026, 6, 10, 12, 34, 56, 789));
    expect(toAtom(d)).toBe('2026-07-10T12:34:56+00:00');
  });

  it('always matches the ATOM pattern (never Z, never milliseconds)', () => {
    const d = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    expect(toAtom(d)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/);
  });
});

describe('generateEventId', () => {
  it('produces a v4-shaped UUID', () => {
    expect(generateEventId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('produces unique values', () => {
    expect(generateEventId()).not.toBe(generateEventId());
  });
});
