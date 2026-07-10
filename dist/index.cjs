'use strict';

var ErrorStackParser = require('error-stack-parser');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var ErrorStackParser__default = /*#__PURE__*/_interopDefault(ErrorStackParser);

// src/dsn.ts
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function parseDsn(dsn) {
  if (typeof dsn !== "string") return null;
  const parts = dsn.split(":");
  if (parts.length !== 4) return null;
  const [hostname, uuid, account, project] = parts;
  if (!hostname || !uuid || !account || !project) return null;
  if (!UUID_RE.test(uuid)) return null;
  const endpointUrl = `https://${hostname}/dwlog/event/${account}/${project}/${uuid}`;
  return { hostname, uuid, account, project, endpointUrl };
}

// src/scope.ts
var Scope = class {
  constructor(maxBreadcrumbs = 30) {
    this.user = null;
    this.tags = {};
    this.breadcrumbs = [];
    this.maxBreadcrumbs = maxBreadcrumbs;
  }
  setUser(user) {
    this.user = user;
  }
  setTag(key, value) {
    this.tags[key] = value;
  }
  setTags(tags) {
    Object.assign(this.tags, tags);
  }
  addBreadcrumb(b) {
    this.breadcrumbs.push(b);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.splice(0, this.breadcrumbs.length - this.maxBreadcrumbs);
    }
  }
  getBreadcrumbs() {
    return [...this.breadcrumbs];
  }
  clear() {
    this.user = null;
    this.tags = {};
    this.breadcrumbs = [];
  }
};
function framesFromError(error) {
  let parsed;
  try {
    parsed = ErrorStackParser__default.default.parse(error);
  } catch {
    return [];
  }
  return parsed.map((f) => ({
    file: f.fileName ?? "",
    line: f.lineNumber ?? 0,
    column: f.columnNumber,
    function: f.functionName ?? "",
    class: "",
    args: [],
    code: {}
  }));
}

// src/util.ts
function toAtom(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}+00:00`;
}
function generateEventId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}

// src/eventbuilder.ts
function collectServerVars() {
  return {
    SERVER_NAME: location.hostname,
    REQUEST_URI: location.pathname + location.search,
    HTTP_USER_AGENT: navigator.userAgent,
    HTTP_REFERER: document.referrer
  };
}
function buildMeta(ctx) {
  const meta = {};
  if (ctx.scope.user) meta.user = { ...ctx.scope.user };
  meta.dawilog_session_data = { ...ctx.scope.tags };
  meta.breadcrumbs = ctx.scope.getBreadcrumbs();
  return meta;
}
function assemble(exceptions, ctx) {
  return {
    event_id: generateEventId(),
    timestamp: toAtom(ctx.now ?? /* @__PURE__ */ new Date()),
    release: ctx.release,
    environment: ctx.environment,
    exceptions,
    server_vars: collectServerVars(),
    meta: buildMeta(ctx)
  };
}
function buildExceptionEvent(error, ctx) {
  const exception = {
    type: error.name || "Error",
    value: error.message || "",
    trace: framesFromError(error)
  };
  return assemble([exception], ctx);
}
function buildMessageEvent(message, ctx, level) {
  const exception = { type: "Message", value: message, trace: [] };
  const event = assemble([exception], ctx);
  if (level) {
    event.meta.dawilog_session_data = {
      ...event.meta.dawilog_session_data,
      level
    };
  }
  return event;
}

// src/transport.ts
var MAX_SAFE_BODY = 6e4;
var CONTENT_TYPE = "text/plain;charset=utf-8";
function sendEvent(url, event, options = {}) {
  const { useBeacon = false, debug = false } = options;
  let body;
  try {
    body = JSON.stringify(event);
  } catch {
    return;
  }
  if (debug && body.length > MAX_SAFE_BODY) {
    console.warn(
      `[dawilog] event payload is ${body.length} bytes, near the ~64KB transport limit; it may be dropped`
    );
  }
  try {
    if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: CONTENT_TYPE });
      const queued = navigator.sendBeacon(url, blob);
      if (debug && !queued) {
        console.warn(
          "[dawilog] sendBeacon refused the payload (queue full or over the ~64KB limit); event dropped"
        );
      }
      return;
    }
    const promise = fetch(url, {
      method: "POST",
      headers: { "Content-Type": CONTENT_TYPE },
      body,
      keepalive: true
    });
    if (debug) {
      promise.then((res) => res.text().then((text) => ({ ok: res.ok, text }))).then(({ ok, text }) => {
        if (!ok || text.includes("'status': 'false'") || text.includes('"status":"false"')) {
          console.warn(
            "[dawilog] server rejected the event (check the DSN account/project/uuid):",
            text
          );
        }
      }).catch(() => {
      });
    } else {
      promise.catch(() => {
      });
    }
  } catch {
  }
}

// src/client.ts
var DEDUP_WINDOW_MS = 5e3;
function normalizeSampleRate(value, debug) {
  if (value === void 0) return 1;
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    if (debug) {
      console.warn(`[dawilog] invalid sampleRate ${value}; using 1`);
    }
    return 1;
  }
  return value;
}
function normalizeMaxBreadcrumbs(value, debug) {
  if (value === void 0) return 30;
  if (!Number.isFinite(value) || value < 0) {
    if (debug) {
      console.warn(`[dawilog] invalid maxBreadcrumbs ${value}; using 30`);
    }
    return 30;
  }
  return Math.floor(value);
}
var Client = class {
  constructor(options) {
    this.unloading = false;
    this.lastSent = /* @__PURE__ */ new Map();
    this.dsn = parseDsn(options.dsn);
    this.options = {
      environment: "production",
      release: "",
      ...options,
      sampleRate: normalizeSampleRate(options.sampleRate, options.debug),
      maxBreadcrumbs: normalizeMaxBreadcrumbs(options.maxBreadcrumbs, options.debug)
    };
    this.scope = new Scope(this.options.maxBreadcrumbs);
    this.enabled = this.dsn !== null;
    if (!this.enabled && this.options.debug) {
      console.warn("[dawilog] invalid DSN, sending disabled:", options.dsn);
    }
  }
  get endpointUrl() {
    return this.dsn?.endpointUrl ?? "";
  }
  setUnloading(v) {
    this.unloading = v;
  }
  captureException(error) {
    try {
      const err = error instanceof Error ? error : new Error(String(error));
      this.dispatch(buildExceptionEvent(err, this.ctx()));
    } catch (e) {
      this.internalError(e);
    }
  }
  captureMessage(message, level = "info") {
    try {
      this.dispatch(buildMessageEvent(message, this.ctx(), level));
    } catch (e) {
      this.internalError(e);
    }
  }
  ctx() {
    return {
      environment: this.options.environment,
      release: this.options.release,
      scope: this.scope
    };
  }
  dispatch(event) {
    if (!this.enabled || !this.dsn) return;
    let final = event;
    if (this.options.beforeSend) {
      try {
        final = this.options.beforeSend(event);
      } catch (e) {
        this.internalError(e);
        return;
      }
    }
    if (!final) return;
    if (this.isDuplicate(final)) return;
    if (this.options.sampleRate < 1 && Math.random() >= this.options.sampleRate) return;
    sendEvent(this.dsn.endpointUrl, final, {
      useBeacon: this.unloading,
      debug: this.options.debug
    });
  }
  isDuplicate(event) {
    const ex = event.exceptions[0];
    if (!ex) return false;
    const frame = ex.trace[0];
    const signature = `${ex.type}|${ex.value}|${frame ? `${frame.file}:${frame.line}` : ""}`;
    const now = Date.now();
    const last = this.lastSent.get(signature);
    if (last !== void 0 && now - last < DEDUP_WINDOW_MS) return true;
    this.lastSent.set(signature, now);
    return false;
  }
  internalError(e) {
    if (this.options.debug) {
      console.warn("[dawilog] internal error:", e);
    }
  }
};

// src/handlers.ts
function installGlobalHandlers(client) {
  const onError = (event) => {
    const err = event.error instanceof Error ? event.error : new Error(event.message);
    client.captureException(err);
  };
  const onRejection = (event) => {
    const reason = event.reason;
    if (reason instanceof Error) {
      client.captureException(reason);
      return;
    }
    let message;
    try {
      message = typeof reason === "string" ? reason : JSON.stringify(reason);
    } catch {
      message = String(reason);
    }
    client.captureException(new Error(message));
  };
  const onHidden = () => client.setUnloading(true);
  const onVisibility = () => client.setUnloading(document.visibilityState === "hidden");
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("pagehide", onHidden);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("pagehide", onHidden);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

// src/breadcrumbs/console.ts
var LEVELS = {
  log: "info",
  info: "info",
  warn: "warning",
  error: "error",
  debug: "debug"
};
function installConsoleBreadcrumbs(scope) {
  const methods = Object.keys(LEVELS);
  const originals = {};
  for (const method of methods) {
    const original = console[method];
    originals[method] = original;
    console[method] = (...args) => {
      try {
        scope.addBreadcrumb({
          timestamp: toAtom(/* @__PURE__ */ new Date()),
          category: "console",
          level: LEVELS[method],
          message: args.map((a) => String(a)).join(" ")
        });
      } catch {
      }
      return original.apply(console, args);
    };
  }
  return () => {
    for (const method of methods) {
      console[method] = originals[method];
    }
  };
}

// src/breadcrumbs/dom.ts
function describeElement(el) {
  if (!el) return "";
  let descriptor = el.tagName.toLowerCase();
  if (el.id) descriptor += `#${el.id}`;
  if (typeof el.className === "string" && el.className.trim()) {
    descriptor += "." + el.className.trim().split(/\s+/).join(".");
  }
  return descriptor;
}
function installDomBreadcrumbs(scope) {
  const handler = (event) => {
    try {
      scope.addBreadcrumb({
        timestamp: toAtom(/* @__PURE__ */ new Date()),
        category: "ui.click",
        message: describeElement(event.target)
      });
    } catch {
    }
  };
  document.addEventListener("click", handler, true);
  return () => document.removeEventListener("click", handler, true);
}

// src/breadcrumbs/http.ts
function record(scope, method, url, status) {
  try {
    scope.addBreadcrumb({
      timestamp: toAtom(/* @__PURE__ */ new Date()),
      category: "http",
      message: `${method} ${url} [${status}]`,
      data: { method, url, status }
    });
  } catch {
  }
}
function urlOf(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}
function installHttpBreadcrumbs(scope, ignoreUrl) {
  const originalFetch = window.fetch;
  window.fetch = function(input, init2) {
    const method = (init2?.method ?? "GET").toUpperCase();
    const url = urlOf(input);
    const promise = originalFetch.call(window, input, init2);
    if (url !== ignoreUrl) {
      promise.then(
        (res) => record(scope, method, url, res.status),
        () => record(scope, method, url, 0)
      );
    }
    return promise;
  };
  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSend = proto.send;
  proto.open = function(method, url, ...rest) {
    this.__dawilog = { method: method.toUpperCase(), url: String(url) };
    return originalOpen.apply(this, [method, url, ...rest]);
  };
  proto.send = function(...args) {
    const meta = this.__dawilog;
    if (meta && meta.url !== ignoreUrl) {
      this.addEventListener("loadend", () => record(scope, meta.method, meta.url, this.status));
    }
    return originalSend.apply(this, args);
  };
  return () => {
    window.fetch = originalFetch;
    proto.open = originalOpen;
    proto.send = originalSend;
  };
}

// src/breadcrumbs/history.ts
function installHistoryBreadcrumbs(scope) {
  const record2 = (from, to) => {
    try {
      scope.addBreadcrumb({
        timestamp: toAtom(/* @__PURE__ */ new Date()),
        category: "navigation",
        message: `${from} -> ${to}`,
        data: { from, to }
      });
    } catch {
    }
  };
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  history.pushState = function(...args) {
    const from = location.pathname;
    const ret = originalPush.apply(this, args);
    record2(from, location.pathname);
    return ret;
  };
  history.replaceState = function(...args) {
    const from = location.pathname;
    const ret = originalReplace.apply(this, args);
    record2(from, location.pathname);
    return ret;
  };
  const onPop = () => record2("", location.pathname);
  window.addEventListener("popstate", onPop);
  return () => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    window.removeEventListener("popstate", onPop);
  };
}

// src/breadcrumbs/index.ts
function installBreadcrumbs(scope, integrations, ignoreUrl) {
  const teardowns2 = [];
  if (integrations.console) teardowns2.push(installConsoleBreadcrumbs(scope));
  if (integrations.dom) teardowns2.push(installDomBreadcrumbs(scope));
  if (integrations.fetch) teardowns2.push(installHttpBreadcrumbs(scope, ignoreUrl));
  if (integrations.history) teardowns2.push(installHistoryBreadcrumbs(scope));
  return teardowns2;
}

// src/index.ts
var VERSION = "0.1.0";
var current = null;
var teardowns = [];
var DEFAULT_INTEGRATIONS = { console: true, dom: true, fetch: true, history: true };
function init(options) {
  if (current) {
    if (options.debug) {
      console.warn("[dawilog] init() called more than once; ignoring the new options");
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
function captureException(error) {
  current?.captureException(error);
}
function captureMessage(message, level) {
  current?.captureMessage(message, level);
}
function setUser(user) {
  current?.scope.setUser(user);
}
function setTag(key, value) {
  current?.scope.setTag(key, value);
}
function setTags(tags) {
  current?.scope.setTags(tags);
}
function addBreadcrumb(input) {
  current?.scope.addBreadcrumb({ timestamp: toAtom(/* @__PURE__ */ new Date()), ...input });
}
function close() {
  teardowns.forEach((t) => t());
  teardowns = [];
  current = null;
}

exports.VERSION = VERSION;
exports.addBreadcrumb = addBreadcrumb;
exports.captureException = captureException;
exports.captureMessage = captureMessage;
exports.close = close;
exports.init = init;
exports.setTag = setTag;
exports.setTags = setTags;
exports.setUser = setUser;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map