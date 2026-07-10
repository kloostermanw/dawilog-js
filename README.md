# @dawilog/browser

Browser SDK that reports JavaScript errors to [dawilog](https://log.dawi.dev).

## Install

```bash
npm install @dawilog/browser
```

## Usage

```ts
import { init, captureException, setUser, setTag } from '@dawilog/browser';

init({
  dsn: 'log.dawi.dev:<project-uuid>:<account-slug>:<project-slug>',
  environment: 'production',
  release: '1.2.3',
});

setUser({ id: 1, email: 'user@example.com', name: 'Alice' });
setTag('feature', 'checkout');

try {
  doWork();
} catch (err) {
  captureException(err);
}
```

Once `init` is called, uncaught errors and unhandled promise rejections are captured
automatically. Breadcrumbs (console, DOM clicks, fetch/XHR, history navigation) are
collected by default and can be toggled via the `integrations` option.

## Server requirement (CORS)

Events are sent as a CORS-safelisted `text/plain` request, so no preflight is required
and the POST reaches the server cross-origin. For the SDK to also read the response (used
by `debug` mode to detect a misconfigured DSN), the dawilog server must return CORS
headers for the ingest path. Add `dwlog/*` to `config/cors.php` `paths` on the server:

```php
'paths' => ['api/*', 'dwlog/*'],
```

Without this, delivery still works, but the SDK cannot read the response and `debug`
cannot report a rejected DSN.

## Framework error handlers (Vue, React, …)

The SDK captures errors that reach `window.onerror` / `unhandledrejection`. Some
frameworks catch component errors internally before they bubble to `window`. It has no
framework integration, so wire the framework's error hook to `captureException` yourself.

Vue 3:

```ts
import { captureException } from '@dawilog/browser';
app.config.errorHandler = (err) => captureException(err);
```

React: report from an error boundary's `componentDidCatch`.

## Throttling and deduplication

The dawilog server throttles ingestion to 30 requests/minute per IP. To avoid burning that
budget, the SDK suppresses an identical error signature (`type | message | top frame`) seen
again within a 5-second window. The server also groups identical events, so nothing is lost
in the dashboard.

## Privacy

`console.*` arguments are stringified into breadcrumbs and may contain tokens or PII. Use
`beforeSend` to scrub or drop `meta.breadcrumbs` before an event is sent, or disable the
`console` integration.

## Options

| Option | Default | Description |
|---|---|---|
| `dsn` | (required) | `hostname:project_uuid:account_slug:project_slug` |
| `environment` | `'production'` | Environment label |
| `release` | `''` | Release/version string |
| `sampleRate` | `1.0` | Fraction of events to send (0 to 1) |
| `maxBreadcrumbs` | `30` | Breadcrumb buffer size |
| `integrations` | all `true` | `{ console, dom, fetch, history }` toggles |
| `beforeSend` | (none) | `(event) => event \| null`; return `null` to drop |
| `debug` | `false` | Log internal errors/failures to the console |

## API

- `captureException(error)`
- `captureMessage(message, level?)`
- `setUser(user)` / `setTag(key, value)` / `setTags(obj)`
- `addBreadcrumb({ category, message, level?, data? })`
- `close()` (remove all handlers/instrumentation, mainly for tests)
