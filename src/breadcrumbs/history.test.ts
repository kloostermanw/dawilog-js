import { describe, it, expect, beforeEach } from 'vitest';
import { installHistoryBreadcrumbs } from './history';
import { Scope } from '../scope';

describe('installHistoryBreadcrumbs', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/start');
  });

  it('records a navigation breadcrumb on pushState', () => {
    const scope = new Scope();
    const teardown = installHistoryBreadcrumbs(scope);

    window.history.pushState({}, '', '/next');

    const crumbs = scope.getBreadcrumbs();
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toMatchObject({
      category: 'navigation',
      data: { from: '/start', to: '/next' },
    });

    teardown();
    window.history.pushState({}, '', '/again');
    expect(scope.getBreadcrumbs()).toHaveLength(1);
  });
});
