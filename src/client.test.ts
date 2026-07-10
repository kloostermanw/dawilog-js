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

  it('captureMessage sends a Message exception', () => {
    new Client({ dsn: DSN }).captureMessage('hello');
    expect(sendSpy.mock.calls[0][1].exceptions[0].type).toBe('Message');
  });
});
