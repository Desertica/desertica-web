/**
 * Runs before every spec. Specs can share one jsdom worker, so browser state set by one test
 * (locale cookie, stored theme, intro flag) must not leak into the next.
 */
beforeEach(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // Storage may be stubbed to throw by the spec that runs next; it sets up its own.
  }

  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name) {
      document.cookie = `${name}=; path=/; max-age=0`;
    }
  }

  const root = document.documentElement;
  root.lang = 'en';
  root.classList.remove('dark');
  delete root.dataset['intro'];
});
