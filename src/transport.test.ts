import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendEvent } from './transport';
import type { DawilogEvent } from './types';

const URL = 'https://log.dawi.dev/dwlog/event/acme/web-app/uuid';
const event = { event_id: 'x', timestamp: 't', exceptions: [] } as unknown as DawilogEvent;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sendEvent', () => {
  it('POSTs via fetch with a CORS-safelisted text/plain body when not unloading', () => {
    const fetchMock = vi.fn(() => Promise.resolve({ status: 200 } as Response));
    vi.stubGlobal('fetch', fetchMock);

    sendEvent(URL, event, { useBeacon: false });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe(URL);
    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      keepalive: true,
    });
    expect(JSON.parse(init.body as string)).toMatchObject({ event_id: 'x' });
  });

  it('uses sendBeacon with a text/plain Blob when unloading', () => {
    const beacon = vi.fn((_url: string, _body?: BodyInit) => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    sendEvent(URL, event, { useBeacon: true });

    expect(beacon).toHaveBeenCalledOnce();
    expect(beacon.mock.calls[0][0]).toBe(URL);
    const blob = beacon.mock.calls[0][1] as Blob;
    expect(blob.type).toBe('text/plain;charset=utf-8');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws when fetch rejects', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))));
    expect(() => sendEvent(URL, event, { useBeacon: false })).not.toThrow();
  });

  it('warns in debug mode when the server rejects the event', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve("{ 'status': 'false'}"),
        } as unknown as Response),
      ),
    );

    sendEvent(URL, event, { useBeacon: false, debug: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain('server rejected');
  });
});
