import { Scope } from '../scope';
import { toAtom } from '../util';

function record(scope: Scope, method: string, url: string, status: number): void {
  try {
    scope.addBreadcrumb({
      timestamp: toAtom(new Date()),
      category: 'http',
      message: `${method} ${url} [${status}]`,
      data: { method, url, status },
    });
  } catch {
    /* ignore */
  }
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url;
}

export function installHttpBreadcrumbs(scope: Scope, ignoreUrl: string): () => void {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const method = (init?.method ?? 'GET').toUpperCase();
    const url = urlOf(input);
    const promise = originalFetch.call(window, input, init);
    if (url !== ignoreUrl) {
      promise.then(
        (res) => record(scope, method, url, res.status),
        () => record(scope, method, url, 0),
      );
    }
    return promise;
  };

  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSend = proto.send;

  proto.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: any[]) {
    (this as any).__dawilog = { method: method.toUpperCase(), url: String(url) };
    return originalOpen.apply(this, [method, url, ...rest] as any);
  };

  proto.send = function (this: XMLHttpRequest, ...args: any[]) {
    const meta = (this as any).__dawilog as { method: string; url: string } | undefined;
    if (meta && meta.url !== ignoreUrl) {
      this.addEventListener('loadend', () => record(scope, meta.method, meta.url, this.status));
    }
    return originalSend.apply(this, args as any);
  };

  return () => {
    window.fetch = originalFetch;
    proto.open = originalOpen;
    proto.send = originalSend;
  };
}
