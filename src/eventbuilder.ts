import type { DawilogEvent, Exception, Level } from './types';
import { Scope } from './scope';
import { framesFromError } from './stacktrace';
import { toAtom, generateEventId } from './util';

export interface BuildContext {
  environment: string;
  release: string;
  scope: Scope;
  now?: Date;
}

export function collectServerVars(): Record<string, string> {
  return {
    SERVER_NAME: location.hostname,
    REQUEST_URI: location.pathname + location.search,
    HTTP_USER_AGENT: navigator.userAgent,
    HTTP_REFERER: document.referrer,
  };
}

function buildMeta(ctx: BuildContext): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  if (ctx.scope.user) meta.user = ctx.scope.user;
  meta.dawilog_session_data = ctx.scope.tags;
  meta.breadcrumbs = ctx.scope.getBreadcrumbs();
  return meta;
}

function assemble(exceptions: Exception[], ctx: BuildContext): DawilogEvent {
  return {
    event_id: generateEventId(),
    timestamp: toAtom(ctx.now ?? new Date()),
    release: ctx.release,
    environment: ctx.environment,
    exceptions,
    server_vars: collectServerVars(),
    meta: buildMeta(ctx),
  };
}

export function buildExceptionEvent(error: Error, ctx: BuildContext): DawilogEvent {
  const exception: Exception = {
    type: error.name || 'Error',
    value: error.message || '',
    trace: framesFromError(error),
  };
  return assemble([exception], ctx);
}

export function buildMessageEvent(
  message: string,
  ctx: BuildContext,
  level?: Level,
): DawilogEvent {
  const exception: Exception = { type: 'Message', value: message, trace: [] };
  const event = assemble([exception], ctx);
  if (level) {
    // Copy so the event-local level does not mutate the shared scope tags.
    event.meta.dawilog_session_data = {
      ...(event.meta.dawilog_session_data as Record<string, unknown>),
      level,
    };
  }
  return event;
}
