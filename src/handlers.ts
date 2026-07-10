import { Client } from './client';

export function installGlobalHandlers(client: Client): () => void {
  const onError = (event: ErrorEvent): void => {
    const err = event.error instanceof Error ? event.error : new Error(event.message);
    client.captureException(err);
  };

  const onRejection = (event: PromiseRejectionEvent): void => {
    const reason = event.reason;
    if (reason instanceof Error) {
      client.captureException(reason);
      return;
    }
    let message: string;
    try {
      message = typeof reason === 'string' ? reason : JSON.stringify(reason);
    } catch {
      // A circular or otherwise non-serializable reason must not make the SDK's
      // own global handler throw, which would lose the rejection entirely.
      message = String(reason);
    }
    client.captureException(new Error(message));
  };

  // pagehide is terminal: the page is going away, flush via sendBeacon.
  const onHidden = (): void => client.setUnloading(true);
  // visibilitychange toggles both ways so backgrounding a tab does not latch the
  // client onto sendBeacon (and its ~64KB cap) for the rest of the session.
  const onVisibility = (): void => client.setUnloading(document.visibilityState === 'hidden');

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  window.addEventListener('pagehide', onHidden);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    window.removeEventListener('pagehide', onHidden);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
