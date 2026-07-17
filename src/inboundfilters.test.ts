import { describe, it, expect } from 'vitest';
import type { DawilogEvent, Exception } from './types';
import { isOpaqueScriptError } from './inboundfilters';

function eventWith(exceptions: Array<Partial<Exception>>): DawilogEvent {
  return {
    event_id: 'e',
    timestamp: '',
    release: '',
    environment: 'production',
    exceptions: exceptions as Exception[],
    server_vars: {},
    meta: {},
  };
}

describe('isOpaqueScriptError', () => {
  it('is true for a masked cross-origin "Script error." event', () => {
    expect(isOpaqueScriptError(eventWith([{ type: 'Error', value: 'Script error.' }]))).toBe(true);
  });

  it('is true when the browser omits the trailing period', () => {
    expect(isOpaqueScriptError(eventWith([{ value: 'Script error' }]))).toBe(true);
  });

  it('is true regardless of case and surrounding whitespace', () => {
    expect(isOpaqueScriptError(eventWith([{ value: '  script ERROR.  ' }]))).toBe(true);
  });

  it('is false for a real error carrying a message', () => {
    expect(isOpaqueScriptError(eventWith([{ value: "Cannot read properties of undefined" }]))).toBe(false);
  });

  it('is false when the message merely contains "Script error." as a substring', () => {
    expect(isOpaqueScriptError(eventWith([{ value: 'Script error. while loading widget' }]))).toBe(false);
  });

  it('is false when there is more than one exception', () => {
    expect(isOpaqueScriptError(eventWith([{ value: 'Script error.' }, { value: 'real' }]))).toBe(false);
  });

  it('is false when there are no exceptions', () => {
    expect(isOpaqueScriptError(eventWith([]))).toBe(false);
  });
});
