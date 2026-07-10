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
