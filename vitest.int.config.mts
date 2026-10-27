import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.int.test.ts'],
    env: { MONGODB_DB: 'buildplan_test' },
    fileParallelism: false,
    testTimeout: 20000,
  },
});
