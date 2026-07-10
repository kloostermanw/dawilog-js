import { describe, it, expect, vi, afterEach } from 'vitest';
import { installHttpBreadcrumbs } from './http';
import { Scope } from '../scope';

const IGNORE = 'https://log.dawi.dev/dwlog/event/acme/web-app/uuid';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('installHttpBreadcrumbs (fetch)', () => {
  it('records a breadcrumb for a fetch call', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ status: 200 } as Response)));
    const scope = new Scope();
    const teardown = installHttpBreadcrumbs(scope, IGNORE);

    await fetch('https://api.example.com/data', { method: 'POST' });
    await Promise.resolve();

    const crumbs = scope.getBreadcrumbs();
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toMatchObject({
      category: 'http',
      data: { method: 'POST', url: 'https://api.example.com/data', status: 200 },
    });
    teardown();
  });

  it('does not record the SDK own endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ status: 200 } as Response)));
    const scope = new Scope();
    const teardown = installHttpBreadcrumbs(scope, IGNORE);

    await fetch(IGNORE, { method: 'POST' });
    await Promise.resolve();

    expect(scope.getBreadcrumbs()).toHaveLength(0);
    teardown();
  });
});
