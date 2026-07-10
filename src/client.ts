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

export class Client {
  private readonly dsn: ParsedDsn | null;
  private readonly options: ResolvedOptions;
  readonly scope: Scope;
  readonly enabled: boolean;
  private unloading = false;

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

  captureMessage(message: string, _level: Level = 'info'): void {
    try {
      this.dispatch(buildMessageEvent(message, this.ctx()));
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
    if (this.options.sampleRate < 1 && Math.random() >= this.options.sampleRate) return;
    sendEvent(this.dsn.endpointUrl, final, this.unloading);
  }

  private internalError(e: unknown): void {
    if (this.options.debug) {
      // eslint-disable-next-line no-console
      console.warn('[dawilog] internal error:', e);
    }
  }
}
