import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['shared/**/*.test.ts', 'src/**/*.test.ts', 'scripts/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'db',
          include: ['tests/db/**/*.test.ts', 'tests/rls/**/*.test.ts', 'tests/functions/**/*.test.ts'],
          environment: 'node',
          fileParallelism: false,
          testTimeout: 30000,
          hookTimeout: 60000,
        },
      },
    ],
  },
});
