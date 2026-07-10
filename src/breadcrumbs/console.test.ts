import { describe, it, expect, vi, afterEach } from 'vitest';
import { installConsoleBreadcrumbs } from './console';
import { Scope } from '../scope';

afterEach(() => vi.restoreAllMocks());

describe('installConsoleBreadcrumbs', () => {
  it('records a breadcrumb per console call and still logs', () => {
    const scope = new Scope();
    const original = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const teardown = installConsoleBreadcrumbs(scope);

    console.warn('careful', 'now');

    const crumbs = scope.getBreadcrumbs();
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toMatchObject({
      category: 'console',
      level: 'warning',
      message: 'careful now',
    });
    teardown();
    expect(original).toHaveBeenCalled();
  });

  it('teardown restores the original console method', () => {
    const scope = new Scope();
    const before = console.log;
    const teardown = installConsoleBreadcrumbs(scope);
    teardown();
    expect(console.log).toBe(before);
  });
});
