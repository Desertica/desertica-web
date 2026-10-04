import { defineConfig } from 'vitest/config';

// The Angular builder defaults to `isolate: false` (one module cache per worker). That lets a mock
// or a failed dynamic import from one spec leak into the next and made CI fail at random, so every
// spec file gets its own module registry.
export default defineConfig({
  test: {
    isolate: true,
  },
});
