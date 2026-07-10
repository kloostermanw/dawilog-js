import { Scope } from '../scope';
import { toAtom } from '../util';

function describeElement(el: Element | null): string {
  if (!el) return '';
  let descriptor = el.tagName.toLowerCase();
  if (el.id) descriptor += `#${el.id}`;
  if (typeof el.className === 'string' && el.className.trim()) {
    descriptor += '.' + el.className.trim().split(/\s+/).join('.');
  }
  return descriptor;
}

export function installDomBreadcrumbs(scope: Scope): () => void {
  const handler = (event: Event): void => {
    try {
      scope.addBreadcrumb({
        timestamp: toAtom(new Date()),
        category: 'ui.click',
        message: describeElement(event.target as Element | null),
      });
    } catch {
      /* ignore */
    }
  };

  document.addEventListener('click', handler, true);
  return () => document.removeEventListener('click', handler, true);
}
