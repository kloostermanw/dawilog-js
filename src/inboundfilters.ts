import type { DawilogEvent } from './types';

// Browsers mask errors thrown by genuinely cross-origin scripts (ad networks,
// tag managers, payment widgets, browser extensions) behind the opaque literal
// "Script error." — some engines drop the trailing period. The real message and
// stack are withheld for security, so the only frame left points at our own
// window.onerror shim rather than the offending code. Only an exact match is
// opaque: a message that merely contains the phrase is a real error.
const OPAQUE_SCRIPT_ERROR_RE = /^script error\.?$/i;

/**
 * True when the event is a browser-masked cross-origin "Script error.".
 *
 * Identified by its message (the one field the browser leaves intact) on a
 * single, standalone Error exception. A user-supplied captureMessage() is
 * emitted as a 'Message' exception and could legitimately carry the text
 * "Script error", so it is never treated as opaque. An event with no exceptions
 * or more than one is likewise never opaque. Such events carry no actionable
 * stack and, reported, only drown real errors, so the client drops them by
 * default (see the filterOpaqueScriptErrors option).
 */
export function isOpaqueScriptError(event: DawilogEvent): boolean {
  const exceptions = event.exceptions ?? [];
  if (exceptions.length !== 1) return false;
  const exception = exceptions[0];
  // Only browser-masked errors are opaque; a captureMessage() ('Message' type)
  // that happens to say "Script error" is a real, intentional report.
  if (exception.type === 'Message') return false;
  const value = typeof exception.value === 'string' ? exception.value.trim() : '';
  return OPAQUE_SCRIPT_ERROR_RE.test(value);
}
