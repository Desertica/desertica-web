export function stubMatchMedia(matches: (query: string) => boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: matches(query),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
}

export function allowMotion(query: string): boolean {
  return query.includes('no-preference') || query.includes('min-width');
}

export function reduceMotion(query: string): boolean {
  return query.includes('prefers-reduced-motion: reduce');
}
