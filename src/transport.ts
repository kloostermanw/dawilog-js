import type { DawilogEvent } from './types';

export interface SendOptions {
  useBeacon?: boolean;
  debug?: boolean;
}

// keepalive fetch and sendBeacon both cap the body around 64KB.
const MAX_SAFE_BODY = 60000;

// Content-Type text/plain is CORS-safelisted, so the cross-origin POST is a
// "simple" request and skips the preflight that the server's /dwlog/* path does
// not answer. Laravel's Request::json() decodes the body regardless of
// Content-Type, so the server still parses it as JSON.
const CONTENT_TYPE = 'text/plain;charset=utf-8';

export function sendEvent(url: string, event: DawilogEvent, options: SendOptions = {}): void {
  const { useBeacon = false, debug = false } = options;

  let body: string;
  try {
    body = JSON.stringify(event);
  } catch {
    return;
  }

  if (debug && body.length > MAX_SAFE_BODY) {
    // eslint-disable-next-line no-console
    console.warn(
      `[dawilog] event payload is ${body.length} bytes, near the ~64KB transport limit; it may be dropped`,
    );
  }

  try {
    if (
      useBeacon &&
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      const blob = new Blob([body], { type: CONTENT_TYPE });
      navigator.sendBeacon(url, blob);
      return;
    }

    const promise = fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': CONTENT_TYPE },
      body,
      keepalive: true,
    });

    if (debug) {
      promise
        .then((res) => res.text().then((text) => ({ ok: res.ok, text })))
        .then(({ ok, text }) => {
          if (!ok || text.includes("'status': 'false'") || text.includes('"status":"false"')) {
            // eslint-disable-next-line no-console
            console.warn(
              '[dawilog] server rejected the event (check the DSN account/project/uuid):',
              text,
            );
          }
        })
        .catch(() => {
          /* opaque or blocked response; nothing to inspect */
        });
    } else {
      promise.catch(() => {
        /* swallow network errors */
      });
    }
  } catch {
    /* swallow */
  }
}
