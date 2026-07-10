import { describe, it, expect, beforeEach } from 'vitest';
import { buildExceptionEvent, buildMessageEvent } from './eventbuilder';
import { Scope } from './scope';

const NOW = new Date(Date.UTC(2026, 6, 10, 12, 34, 56));

function ctx(scope = new Scope()) {
  return { environment: 'production', release: '1.2.3', scope, now: NOW };
}

describe('buildExceptionEvent', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/checkout?step=2');
  });

  it('builds a wire-shaped event from an Error and scope', () => {
    const scope = new Scope();
    scope.setUser({ id: 1, email: 'a@b.com', name: 'Alice' });
    scope.setTag('plan', 'pro');
    scope.addBreadcrumb({
      timestamp: '2026-07-10T00:00:00+00:00',
      category: 'ui.click',
      message: 'button',
    });

    const err = new Error('Cannot read properties of undefined');
    err.name = 'TypeError';
    const event = buildExceptionEvent(err, ctx(scope));

    expect(event.timestamp).toBe('2026-07-10T12:34:56+00:00');
    expect(event.environment).toBe('production');
    expect(event.release).toBe('1.2.3');
    expect(event.event_id).toMatch(/^[0-9a-f-]{36}$/i);

    expect(event.exceptions).toHaveLength(1);
    expect(event.exceptions[0].type).toBe('TypeError');
    expect(event.exceptions[0].value).toBe('Cannot read properties of undefined');

    expect(event.server_vars.SERVER_NAME).toBe(window.location.hostname);
    expect(event.server_vars.REQUEST_URI).toBe('/checkout?step=2');

    expect(event.meta.user).toEqual({ id: 1, email: 'a@b.com', name: 'Alice' });
    expect(event.meta.dawilog_session_data).toEqual({ plan: 'pro' });
    expect((event.meta.breadcrumbs as unknown[]).length).toBe(1);
  });

  it('omits meta.user when no user is set', () => {
    const event = buildExceptionEvent(new Error('x'), ctx());
    expect(event.meta.user).toBeUndefined();
    expect(event.meta.dawilog_session_data).toEqual({});
  });
});

describe('buildMessageEvent', () => {
  it('synthesizes a Message exception with empty trace', () => {
    const event = buildMessageEvent('hello', ctx());
    expect(event.exceptions[0]).toEqual({ type: 'Message', value: 'hello', trace: [] });
  });
});
