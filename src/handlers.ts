import { Client } from './client';

export function installGlobalHandlers(client: Client): () => void {
  const onError = (event: ErrorEvent): void => {
    const err = event.error instanceof Error ? event.error : new Error(event.message);
    client.captureException(err);
  };

  const onRejection = (event: PromiseRejectionEvent): void => {
    const reason = event.reason;
    const err =
      reason instanceof Error
        ? reason
        : new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
    client.captureException(err);
  };

  const onHidden = (): void => client.setUnloading(true);
  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') client.setUnloading(true);
  };

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
