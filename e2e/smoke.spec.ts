/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'

/**
 * スモークテスト: アプリが読み込まれ、基本的なナビゲーションが動作することを検証する。
 */
test.describe('Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // 認証セッション API をモックする
    await page.route('**/api/km/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: { oid: 'user-001', name: 'Test User' },
            roles: ['inquiry_responder'],
          },
        }),
      })
    )

    // 問合せ一覧 API をモックする
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], totalCount: 0 }),
      })
    )

    // タグ一覧 API をモックする
    await page.route('**/api/km/tag/list', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    )
  })

  test('application loads without errors', async ({ page }) => {
    await page.goto('/')
    // ルート URL は問合せ一覧へリダイレクトするはず
    await expect(page).toHaveURL(/#\/inquiry\/list/)
  })

  test('page has a title', async ({ page }) => {
    await page.goto('/')
    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('no console errors on initial load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(errors).toEqual([])
  })

  test('navigating to inquiry/new loads without crash', async ({ page }) => {
    await page.goto('/#/inquiry/new')
    await page.waitForLoadState('networkidle')
    // 未処理エラーが画面に表示されないはず
    await expect(page.locator('body')).not.toContainText('Unhandled')
  })
})
