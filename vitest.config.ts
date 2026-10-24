import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/api/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['server/**/*.ts'],
      exclude: ['server/index.ts', 'server/seed.ts'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: { statements: 85, branches: 75, functions: 85, lines: 85 },
    },
  },
});
