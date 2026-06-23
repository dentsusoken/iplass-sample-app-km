/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import type { Page } from '@playwright/test'

/** 実 iPLAss サーバーにログインし、アプリの読み込みを待つ。 */
export async function login(
  page: Page,
  user = 'testresponder',
  pass = 'testresponder'
) {
  await page.goto('', { waitUntil: 'networkidle' })
  // ログインフォームの表示を待つ
  await page.locator('#id').waitFor({ state: 'visible', timeout: 10000 })
  await page.locator('#id').fill(user)
  await page.locator('#password').fill(pass)
  await page.locator('button[type="submit"]').click()
  // SPA の初期化を待つ (問合せ一覧ルート)
  await page.waitForURL(/.*#\/inquiry\/list/, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}
