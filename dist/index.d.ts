type Level = 'fatal' | 'error' | 'warning' | 'info' | 'debug';
interface User {
    id?: string | number;
    email?: string;
    name?: string;
    [key: string]: unknown;
}
interface Breadcrumb {
    timestamp: string;
    category: string;
    message?: string;
    level?: Level;
    data?: Record<string, unknown>;
}
interface StackFrame {
    file: string;
    line: number;
    column?: number;
    function: string;
    class: string;
    args: unknown[];
    code: Record<string, string>;
}
interface Exception {
    type: string;
    value: string;
    trace: StackFrame[];
}
interface DawilogEvent {
    event_id: string;
    timestamp: string;
    release: string;
    environment: string;
    exceptions: Exception[];
    server_vars: Record<string, string>;
    meta: Record<string, unknown>;
}
interface IntegrationOptions {
    console?: boolean;
    dom?: boolean;
    fetch?: boolean;
    history?: boolean;
}
interface DawilogOptions {
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

declare class Scope {
    user: User | null;
    tags: Record<string, unknown>;
    private breadcrumbs;
    private readonly maxBreadcrumbs;
    constructor(maxBreadcrumbs?: number);
    setUser(user: User | null): void;
    setTag(key: string, value: unknown): void;
    setTags(tags: Record<string, unknown>): void;
    addBreadcrumb(b: Breadcrumb): void;
    getBreadcrumbs(): Breadcrumb[];
    clear(): void;
}

declare class Client {
    private readonly dsn;
    private readonly options;
    readonly scope: Scope;
    readonly enabled: boolean;
    private unloading;
    private readonly lastSent;
    constructor(options: DawilogOptions);
    get endpointUrl(): string;
    setUnloading(v: boolean): void;
    captureException(error: unknown): void;
    captureMessage(message: string, level?: Level): void;
    private ctx;
    private dispatch;
    private isDuplicate;
    private internalError;
}

declare const VERSION = "0.1.0";
declare function init(options: DawilogOptions): Client;
declare function captureException(error: unknown): void;
declare function captureMessage(message: string, level?: Level): void;
declare function setUser(user: User | null): void;
declare function setTag(key: string, value: unknown): void;
declare function setTags(tags: Record<string, unknown>): void;
declare function addBreadcrumb(input: Omit<Breadcrumb, 'timestamp'> & {
    timestamp?: string;
}): void;
declare function close(): void;

export { type Breadcrumb, type DawilogEvent, type DawilogOptions, type Exception, type IntegrationOptions, type Level, type StackFrame, type User, VERSION, addBreadcrumb, captureException, captureMessage, close, init, setTag, setTags, setUser };
