const pending = new Map<string, Promise<void>>();

/**
 * Loads a third-party script once and resolves when it runs. The payment gateways load through
 * this, and only from the payment step: they are needed to pay, so they do not wait for the cookie
 * banner, but nothing else on the site pulls them in. A failed load is forgotten so a retry works.
 */
export function loadScript(document: Document, src: string): Promise<void> {
  const known = pending.get(src);
  if (known) {
    return known;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        script.remove();
        reject(new Error(`script_failed:${src}`));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });
  pending.set(src, promise);
  promise.catch(() => pending.delete(src));
  return promise;
}

/** Forgets loaded scripts (tests). */
export function resetScriptCache(): void {
  pending.clear();
}
