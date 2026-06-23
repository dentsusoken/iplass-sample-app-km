/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const e2eConfig = JSON.parse(
  readFileSync('e2e-integration/e2e.config.json', 'utf-8')
)
const baseURL = `http://localhost:${e2eConfig.port}/${e2eConfig.contextPath}/${e2eConfig.tenantName}/${e2eConfig.spaPath}`

/**
 * Integration test config — runs against a real iPLAss server (no mocks).
 * Usage: npx playwright test --config playwright.integration.config.ts
 */
export default defineConfig({
  testDir: './e2e-integration',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-integration' }],
  ],
  timeout: 60000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    actionTimeout: 15000,
    locale: 'ja-JP',
    extraHTTPHeaders: { 'Accept-Language': 'ja' },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
