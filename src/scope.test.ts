import { describe, it, expect } from 'vitest';
import { Scope } from './scope';
import type { Breadcrumb } from './types';

const crumb = (message: string): Breadcrumb => ({
  timestamp: '2026-07-10T00:00:00+00:00',
  category: 'test',
  message,
});

describe('Scope', () => {
  it('stores user and tags', () => {
    const s = new Scope();
    s.setUser({ id: 1, email: 'a@b.com' });
    s.setTag('plan', 'pro');
    s.setTags({ ab: 'variant-b' });
    expect(s.user).toEqual({ id: 1, email: 'a@b.com' });
    expect(s.tags).toEqual({ plan: 'pro', ab: 'variant-b' });
  });

  it('evicts oldest breadcrumbs beyond maxBreadcrumbs', () => {
    const s = new Scope(2);
    s.addBreadcrumb(crumb('a'));
    s.addBreadcrumb(crumb('b'));
    s.addBreadcrumb(crumb('c'));
    expect(s.getBreadcrumbs().map((b) => b.message)).toEqual(['b', 'c']);
  });

  it('clears all state', () => {
    const s = new Scope();
    s.setUser({ id: 1 });
    s.setTag('x', 'y');
    s.addBreadcrumb(crumb('a'));
    s.clear();
    expect(s.user).toBeNull();
    expect(s.tags).toEqual({});
    expect(s.getBreadcrumbs()).toEqual([]);
  });
});
