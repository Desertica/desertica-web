/** `localStorage` throws when the browser blocks it (private mode, disabled site data), even on property access: callers get `null` or a no-op instead. */
export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The value is simply not remembered.
  }
}
