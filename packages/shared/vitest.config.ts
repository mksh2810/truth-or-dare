import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/phases.ts', 'src/xp.ts', 'src/vote.ts', 'src/spin.ts', 'src/deck.ts', 'src/validators.ts', 'src/moderation.ts'],
      thresholds: {
        'src/phases.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
        'src/xp.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
        'src/vote.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
        'src/spin.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  },
});
