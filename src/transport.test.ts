import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendEvent } from './transport';
import type { DawilogEvent } from './types';

const URL = 'https://log.dawi.dev/dwlog/event/acme/web-app/uuid';
const event = { event_id: 'x', timestamp: 't', exceptions: [] } as unknown as DawilogEvent;

afterEach(() => vi.unstubAllGlobals());

describe('sendEvent', () => {
  it('POSTs via fetch with JSON body when not unloading', () => {
    const fetchMock = vi.fn(() => Promise.resolve({ status: 200 } as Response));
    vi.stubGlobal('fetch', fetchMock);

    sendEvent(URL, event, false);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe(URL);
    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
    expect(JSON.parse(init.body as string)).toMatchObject({ event_id: 'x' });
  });

  it('uses sendBeacon when unloading and available', () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    sendEvent(URL, event, true);

    expect(beacon).toHaveBeenCalledOnce();
    expect(beacon.mock.calls[0][0]).toBe(URL);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws when fetch rejects', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))));
    expect(() => sendEvent(URL, event, false)).not.toThrow();
  });
});
