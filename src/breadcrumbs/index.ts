import { Scope } from '../scope';
import type { IntegrationOptions } from '../types';
import { installConsoleBreadcrumbs } from './console';
import { installDomBreadcrumbs } from './dom';
import { installHttpBreadcrumbs } from './http';
import { installHistoryBreadcrumbs } from './history';

export function installBreadcrumbs(
  scope: Scope,
  integrations: IntegrationOptions,
  ignoreUrl: string,
): Array<() => void> {
  const teardowns: Array<() => void> = [];
  if (integrations.console) teardowns.push(installConsoleBreadcrumbs(scope));
  if (integrations.dom) teardowns.push(installDomBreadcrumbs(scope));
  if (integrations.fetch) teardowns.push(installHttpBreadcrumbs(scope, ignoreUrl));
  if (integrations.history) teardowns.push(installHistoryBreadcrumbs(scope));
  return teardowns;
}
