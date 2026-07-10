import { Scope } from '../scope';
import { toAtom } from '../util';
import type { Level } from '../types';

const LEVELS: Record<string, Level> = {
  log: 'info',
  info: 'info',
  warn: 'warning',
  error: 'error',
  debug: 'debug',
};

export function installConsoleBreadcrumbs(scope: Scope): () => void {
  const methods = Object.keys(LEVELS);
  const originals: Record<string, unknown> = {};

  for (const method of methods) {
    const original = (console as Record<string, any>)[method];
    originals[method] = original;
    (console as Record<string, any>)[method] = (...args: unknown[]): void => {
      try {
        scope.addBreadcrumb({
          timestamp: toAtom(new Date()),
          category: 'console',
          level: LEVELS[method],
          message: args.map((a) => String(a)).join(' '),
        });
      } catch {
        /* ignore */
      }
      return original.apply(console, args);
    };
  }

  return () => {
    for (const method of methods) {
      (console as Record<string, any>)[method] = originals[method];
    }
  };
}
