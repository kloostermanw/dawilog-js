import type { DawilogOptions, DawilogEvent, Level } from './types';
import { parseDsn, type ParsedDsn } from './dsn';
import { Scope } from './scope';
import { buildExceptionEvent, buildMessageEvent, type BuildContext } from './eventbuilder';
import { sendEvent } from './transport';
import { isOpaqueScriptError } from './inboundfilters';

interface ResolvedOptions extends DawilogOptions {
  environment: string;
  release: string;
  sampleRate: number;
  maxBreadcrumbs: number;
  filterOpaqueScriptErrors: boolean;
}

// Suppress an identical error signature seen again within this window, so a
// tight error loop cannot burn the server's 30 req/min/IP budget resending
// events the server would only dedup anyway.
const DEDUP_WINDOW_MS = 5000;

// sampleRate is a fraction in [0, 1]; anything else (negative, >1, NaN) is a
// caller mistake that would otherwise silently drop or send everything, so fall
// back to 1 (send all) and warn in debug.
function normalizeSampleRate(value: number | undefined, debug?: boolean): number {
  if (value === undefined) return 1;
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.warn(`[dawilog] invalid sampleRate ${value}; using 1`);
    }
    return 1;
  }
  return value;
}

// maxBreadcrumbs must be a non-negative integer; a negative value would make the
// buffer clear itself on every add. Fall back to the default and warn in debug.
function normalizeMaxBreadcrumbs(value: number | undefined, debug?: boolean): number {
  if (value === undefined) return 30;
  if (!Number.isFinite(value) || value < 0) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.warn(`[dawilog] invalid maxBreadcrumbs ${value}; using 30`);
    }
    return 30;
  }
  return Math.floor(value);
}

export class Client {
  private readonly dsn: ParsedDsn | null;
  private readonly options: ResolvedOptions;
  readonly scope: Scope;
  readonly enabled: boolean;
  private unloading = false;
  private readonly lastSent = new Map<string, number>();

  constructor(options: DawilogOptions) {
    this.dsn = parseDsn(options.dsn);
    this.options = {
      environment: 'production',
      release: '',
      ...options,
      sampleRate: normalizeSampleRate(options.sampleRate, options.debug),
      maxBreadcrumbs: normalizeMaxBreadcrumbs(options.maxBreadcrumbs, options.debug),
      filterOpaqueScriptErrors: options.filterOpaqueScriptErrors ?? true,
    };
    this.scope = new Scope(this.options.maxBreadcrumbs);
    this.enabled = this.dsn !== null;
    if (!this.enabled && this.options.debug) {
      // eslint-disable-next-line no-console
      console.warn('[dawilog] invalid DSN, sending disabled:', options.dsn);
    }
  }

  get endpointUrl(): string {
    return this.dsn?.endpointUrl ?? '';
  }

  setUnloading(v: boolean): void {
    this.unloading = v;
  }

  captureException(error: unknown): void {
    try {
      const err = error instanceof Error ? error : new Error(String(error));
      this.dispatch(buildExceptionEvent(err, this.ctx()));
    } catch (e) {
      this.internalError(e);
    }
  }

  captureMessage(message: string, level: Level = 'info'): void {
    try {
      this.dispatch(buildMessageEvent(message, this.ctx(), level));
    } catch (e) {
      this.internalError(e);
    }
  }

  private ctx(): BuildContext {
    return {
      environment: this.options.environment,
      release: this.options.release,
      scope: this.scope,
    };
  }

  private dispatch(event: DawilogEvent): void {
    if (!this.enabled || !this.dsn) return;
    // Opaque cross-origin "Script error." events are unactionable third-party
    // noise; drop them before beforeSend so consumers relying on the default
    // never have to filter them.
    if (this.options.filterOpaqueScriptErrors && isOpaqueScriptError(event)) {
      if (this.options.debug) {
        // eslint-disable-next-line no-console
        console.warn('[dawilog] dropped opaque cross-origin "Script error." event');
      }
      return;
    }
    let final: DawilogEvent | null = event;
    if (this.options.beforeSend) {
      try {
        final = this.options.beforeSend(event);
      } catch (e) {
        // A throwing beforeSend must not silently disable all reporting. Drop
        // this event (it may be half-transformed) but surface the bug in debug.
        this.internalError(e);
        return;
      }
    }
    if (!final) return;
    if (this.isDuplicate(final)) return;
    if (this.options.sampleRate < 1 && Math.random() >= this.options.sampleRate) return;
    sendEvent(this.dsn.endpointUrl, final, {
      useBeacon: this.unloading,
      debug: this.options.debug,
    });
  }

  private isDuplicate(event: DawilogEvent): boolean {
    const ex = event.exceptions[0];
    if (!ex) return false;
    const frame = ex.trace[0];
    const signature = `${ex.type}|${ex.value}|${frame ? `${frame.file}:${frame.line}` : ''}`;
    const now = Date.now();
    const last = this.lastSent.get(signature);
    if (last !== undefined && now - last < DEDUP_WINDOW_MS) return true;
    this.lastSent.set(signature, now);
    return false;
  }

  private internalError(e: unknown): void {
    if (this.options.debug) {
      // eslint-disable-next-line no-console
      console.warn('[dawilog] internal error:', e);
    }
  }
}
