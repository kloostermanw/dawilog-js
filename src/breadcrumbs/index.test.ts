import { describe, it, expect } from 'vitest';
import { installBreadcrumbs } from './index';
import { Scope } from '../scope';

describe('installBreadcrumbs', () => {
  it('installs only enabled integrations and returns teardowns', () => {
    const scope = new Scope();
    const teardowns = installBreadcrumbs(
      scope,
      { console: true, dom: false, fetch: false, history: false },
      'https://ignore',
    );
    expect(teardowns).toHaveLength(1);

    console.info('hi');
    expect(scope.getBreadcrumbs()).toHaveLength(1);

    teardowns.forEach((t) => t());
  });

  it('installs all four when all enabled', () => {
    const scope = new Scope();
    const teardowns = installBreadcrumbs(
      scope,
      { console: true, dom: true, fetch: true, history: true },
      'https://ignore',
    );
    expect(teardowns).toHaveLength(4);
    teardowns.forEach((t) => t());
  });
});
