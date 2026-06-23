/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [{ find: '@', replacement: join(__dirname, '/src/main/vue') }],
  },
  test: {
    environment: 'happy-dom',
    include: ['src/main/vue/**/*.test.ts'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
