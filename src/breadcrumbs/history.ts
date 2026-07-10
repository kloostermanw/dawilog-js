import { Scope } from '../scope';
import { toAtom } from '../util';

export function installHistoryBreadcrumbs(scope: Scope): () => void {
  const record = (from: string, to: string): void => {
    try {
      scope.addBreadcrumb({
        timestamp: toAtom(new Date()),
        category: 'navigation',
        message: `${from} -> ${to}`,
        data: { from, to },
      });
    } catch {
      /* ignore */
    }
  };

  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  history.pushState = function (this: History, ...args: any[]) {
    const from = location.pathname;
    const ret = originalPush.apply(this, args as any);
    record(from, location.pathname);
    return ret;
  };

  history.replaceState = function (this: History, ...args: any[]) {
    const from = location.pathname;
    const ret = originalReplace.apply(this, args as any);
    record(from, location.pathname);
    return ret;
  };

  const onPop = (): void => record('', location.pathname);
  window.addEventListener('popstate', onPop);

  return () => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    window.removeEventListener('popstate', onPop);
  };
}
