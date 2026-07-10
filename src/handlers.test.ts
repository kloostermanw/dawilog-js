import { describe, it, expect, vi, afterEach } from 'vitest';
import { installGlobalHandlers } from './handlers';
import { Client } from './client';

const DSN = 'log.dawi.dev:550e8400-e29b-41d4-a716-446655440000:acme:web-app';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('installGlobalHandlers', () => {
  it('captures window error events', () => {
    const client = new Client({ dsn: DSN });
    const spy = vi.spyOn(client, 'captureException').mockImplementation(() => {});
    const teardown = installGlobalHandlers(client);

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('boom'), message: 'boom' }));

    expect(spy).toHaveBeenCalledOnce();
    teardown();
  });

  it('sets unloading on pagehide', () => {
    const client = new Client({ dsn: DSN });
    const spy = vi.spyOn(client, 'setUnloading');
    const teardown = installGlobalHandlers(client);

    window.dispatchEvent(new Event('pagehide'));

    expect(spy).toHaveBeenCalledWith(true);
    teardown();
  });

  it('resets unloading to false when the tab becomes visible again', () => {
    const client = new Client({ dsn: DSN });
    const spy = vi.spyOn(client, 'setUnloading');
    const teardown = installGlobalHandlers(client);

    // jsdom reports visibilityState as 'visible' by default.
    document.dispatchEvent(new Event('visibilitychange'));

    expect(spy).toHaveBeenLastCalledWith(false);
    teardown();
  });

  it('teardown removes listeners', () => {
    const client = new Client({ dsn: DSN });
    const spy = vi.spyOn(client, 'captureException').mockImplementation(() => {});
    const teardown = installGlobalHandlers(client);
    teardown();

    // No `error` property: the handler is gone, so nothing captures it, and we
    // avoid jsdom surfacing a real Error as an uncaught exception.
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }));
    expect(spy).not.toHaveBeenCalled();
  });
});
