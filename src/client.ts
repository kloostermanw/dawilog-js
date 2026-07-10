import type { DawilogOptions, DawilogEvent, Level } from './types';
import { parseDsn, type ParsedDsn } from './dsn';
import { Scope } from './scope';
import { buildExceptionEvent, buildMessageEvent, type BuildContext } from './eventbuilder';
import { sendEvent } from './transport';

interface ResolvedOptions extends DawilogOptions {
  environment: string;
  release: string;
  sampleRate: number;
  maxBreadcrumbs: number;
}

// Suppress an identical error signature seen again within this window, so a
// tight error loop cannot burn the server's 30 req/min/IP budget resending
// events the server would only dedup anyway.
const DEDUP_WINDOW_MS = 5000;

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
      sampleRate: 1.0,
      maxBreadcrumbs: 30,
      ...options,
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
    let final: DawilogEvent | null = event;
    if (this.options.beforeSend) final = this.options.beforeSend(event);
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
