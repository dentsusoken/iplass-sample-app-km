/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import dns from 'node:dns'
import { defineConfig, devices } from '@playwright/test'

// Node.js 17+ では localhost が IPv6 (::1) に解決されることがあるが、
// Vite は IPv4 (127.0.0.1) でリッスンするため、IPv4 を優先する
dns.setDefaultResultOrder('ipv4first')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:spa',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
