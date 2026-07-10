import type { DawilogOptions, User, Breadcrumb, Level } from './types';
import { Client } from './client';
import { installGlobalHandlers } from './handlers';
import { installBreadcrumbs } from './breadcrumbs';
import { toAtom } from './util';

export const VERSION = '0.1.0';

let current: Client | null = null;
let teardowns: Array<() => void> = [];

const DEFAULT_INTEGRATIONS = { console: true, dom: true, fetch: true, history: true };

export function init(options: DawilogOptions): Client {
  if (current) {
    if (options.debug) {
      // eslint-disable-next-line no-console
      console.warn('[dawilog] init() called more than once; ignoring the new options');
    }
    return current;
  }
  const client = new Client(options);
  current = client;

  if (client.enabled) {
    teardowns.push(installGlobalHandlers(client));
    const integrations = { ...DEFAULT_INTEGRATIONS, ...options.integrations };
    teardowns.push(...installBreadcrumbs(client.scope, integrations, client.endpointUrl));
  }
  return client;
}

export function captureException(error: unknown): void {
  current?.captureException(error);
}

export function captureMessage(message: string, level?: Level): void {
  current?.captureMessage(message, level);
}

export function setUser(user: User | null): void {
  current?.scope.setUser(user);
}

export function setTag(key: string, value: unknown): void {
  current?.scope.setTag(key, value);
}

export function setTags(tags: Record<string, unknown>): void {
  current?.scope.setTags(tags);
}

export function addBreadcrumb(
  input: Omit<Breadcrumb, 'timestamp'> & { timestamp?: string },
): void {
  current?.scope.addBreadcrumb({ timestamp: toAtom(new Date()), ...input });
}

export function close(): void {
  teardowns.forEach((t) => t());
  teardowns = [];
  current = null;
}

export * from './types';
