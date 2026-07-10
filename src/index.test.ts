import { describe, it, expect, vi, afterEach } from 'vitest';
import * as transport from './transport';
import { init, captureException, setUser, setTag, addBreadcrumb, close } from './index';

const DSN = 'log.dawi.dev:550e8400-e29b-41d4-a716-446655440000:acme:web-app';

afterEach(() => {
  close();
  vi.restoreAllMocks();
});

describe('public API', () => {
  it('init installs handlers so uncaught errors are captured', () => {
    const sendSpy = vi.spyOn(transport, 'sendEvent').mockImplementation(() => {});
    init({ dsn: DSN });

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('boom'), message: 'boom' }));

    expect(sendSpy).toHaveBeenCalledOnce();
  });

  it('setUser and setTag feed into the sent event meta', () => {
    const sendSpy = vi.spyOn(transport, 'sendEvent').mockImplementation(() => {});
    init({ dsn: DSN });
    setUser({ id: 7, email: 'a@b.com' });
    setTag('plan', 'pro');

    captureException(new Error('x'));

    const event = sendSpy.mock.calls[0][1];
    expect(event.meta.user).toEqual({ id: 7, email: 'a@b.com' });
    expect(event.meta.dawilog_session_data).toEqual({ plan: 'pro' });
  });

  it('addBreadcrumb fills a timestamp when omitted', () => {
    const sendSpy = vi.spyOn(transport, 'sendEvent').mockImplementation(() => {});
    init({ dsn: DSN, integrations: { console: false, dom: false, fetch: false, history: false } });
    addBreadcrumb({ category: 'manual', message: 'did a thing' });

    captureException(new Error('x'));
    const crumbs = sendSpy.mock.calls[0][1].meta.breadcrumbs as Array<{ timestamp: string }>;
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/);
  });

  it('API calls before init are safe no-ops', () => {
    expect(() => captureException(new Error('x'))).not.toThrow();
  });
});
