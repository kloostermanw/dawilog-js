import type { DawilogEvent } from './types';

export function sendEvent(url: string, event: DawilogEvent, useBeacon: boolean): void {
  let body: string;
  try {
    body = JSON.stringify(event);
  } catch {
    return;
  }

  try {
    if (
      useBeacon &&
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      mode: 'cors',
    }).catch(() => {
      /* swallow network errors */
    });
  } catch {
    /* swallow */
  }
}
