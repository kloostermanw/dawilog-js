export type Level = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface User {
  id?: string | number;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface Breadcrumb {
  timestamp: string;
  category: string;
  message?: string;
  level?: Level;
  data?: Record<string, unknown>;
}

export interface StackFrame {
  file: string;
  line: number;
  column?: number;
  function: string;
  class: string;
  args: unknown[];
  code: Record<string, string>;
}

export interface Exception {
  type: string;
  value: string;
  trace: StackFrame[];
}

export interface DawilogEvent {
  event_id: string;
  timestamp: string;
  release: string;
  environment: string;
  exceptions: Exception[];
  server_vars: Record<string, string>;
  meta: Record<string, unknown>;
}

export interface IntegrationOptions {
  console?: boolean;
  dom?: boolean;
  fetch?: boolean;
  history?: boolean;
}

export interface DawilogOptions {
  dsn: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
  maxBreadcrumbs?: number;
  integrations?: IntegrationOptions;
  beforeSend?: (event: DawilogEvent) => DawilogEvent | null;
  /**
   * Drop browser-masked cross-origin "Script error." events before they reach
   * beforeSend (default true). These originate from third-party scripts or
   * browser extensions and carry no actionable stack. Set false to receive them.
   */
  filterOpaqueScriptErrors?: boolean;
  debug?: boolean;
}
