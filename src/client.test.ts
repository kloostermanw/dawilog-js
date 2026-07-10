import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { Client } from './client';
import * as transport from './transport';

const DSN = 'log.dawi.dev:550e8400-e29b-41d4-a716-446655440000:acme:web-app';

let sendSpy: MockInstance;
beforeEach(() => {
  sendSpy = vi.spyOn(transport, 'sendEvent').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('Client', () => {
  it('captures an exception and sends it to the endpoint URL', () => {
    const client = new Client({ dsn: DSN });
    client.captureException(new Error('boom'));
    expect(sendSpy).toHaveBeenCalledOnce();
    const [url, event] = sendSpy.mock.calls[0];
    expect(url).toContain('/dwlog/event/acme/web-app/');
    expect(event.exceptions[0].value).toBe('boom');
  });

  it('wraps non-Error values', () => {
    new Client({ dsn: DSN }).captureException('just a string');
    expect(sendSpy.mock.calls[0][1].exceptions[0].value).toBe('just a string');
  });

  it('is disabled and never sends with an invalid DSN', () => {
    const client = new Client({ dsn: 'garbage' });
    expect(client.enabled).toBe(false);
    client.captureException(new Error('x'));
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('drops the event when beforeSend returns null', () => {
    const client = new Client({ dsn: DSN, beforeSend: () => null });
    client.captureException(new Error('x'));
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('drops the event when sampleRate is 0', () => {
    const client = new Client({ dsn: DSN, sampleRate: 0 });
    client.captureException(new Error('x'));
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('treats an out-of-range sampleRate as 1 and sends', () => {
    const client = new Client({ dsn: DSN, sampleRate: -1 });
    client.captureException(new Error('x'));
    expect(sendSpy).toHaveBeenCalledOnce();
  });

  it('treats a NaN sampleRate as 1 and sends', () => {
    const client = new Client({ dsn: DSN, sampleRate: Number.NaN });
    client.captureException(new Error('x'));
    expect(sendSpy).toHaveBeenCalledOnce();
  });

  it('sends via beacon after setUnloading(true)', () => {
    const client = new Client({ dsn: DSN });
    client.setUnloading(true);
    client.captureException(new Error('boom'));
    expect(sendSpy.mock.calls[0][2]).toMatchObject({ useBeacon: true });
  });

  it('sends via keepalive fetch (not beacon) by default', () => {
    const client = new Client({ dsn: DSN });
    client.captureException(new Error('boom'));
    expect(sendSpy.mock.calls[0][2]).toMatchObject({ useBeacon: false });
  });

  it('sends the event returned by beforeSend', () => {
    const client = new Client({ dsn: DSN, beforeSend: (e) => ({ ...e, release: 'patched' }) });
    client.captureException(new Error('x'));
    expect(sendSpy.mock.calls[0][1].release).toBe('patched');
  });

  it('drops the event but does not throw when beforeSend throws', () => {
    const client = new Client({
      dsn: DSN,
      beforeSend: () => {
        throw new Error('hook bug');
      },
    });
    expect(() => client.captureException(new Error('x'))).not.toThrow();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('captureMessage sends a Message exception with the level in meta', () => {
    new Client({ dsn: DSN }).captureMessage('hello', 'warning');
    const event = sendSpy.mock.calls[0][1];
    expect(event.exceptions[0].type).toBe('Message');
    expect(event.meta.dawilog_session_data.level).toBe('warning');
  });

  it('suppresses an identical error signature within the dedup window', () => {
    const client = new Client({ dsn: DSN });
    const boom = (): Error => {
      const e = new Error('boom');
      e.stack = 'Error: boom\n    at f (https://app/x.js:1:1)';
      return e;
    };
    client.captureException(boom());
    client.captureException(boom());
    expect(sendSpy).toHaveBeenCalledOnce();
  });

  it('sends distinct errors even within the window', () => {
    const client = new Client({ dsn: DSN });
    client.captureException(new Error('one'));
    client.captureException(new Error('two'));
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it('re-sends the same signature after the dedup window elapses', () => {
    vi.useFakeTimers();
    try {
      const client = new Client({ dsn: DSN });
      const boom = (): Error => {
        const e = new Error('boom');
        e.stack = 'Error: boom\n    at f (https://app/x.js:1:1)';
        return e;
      };
      client.captureException(boom());
      vi.advanceTimersByTime(6000);
      client.captureException(boom());
      expect(sendSpy).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
