/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiries } from './helpers/mock-api'

/**
 * 日付範囲フィルタのモックE2Eテスト
 *
 * - 作成日: [DateFrom] 〜 [DateTo]
 * - パラメータ: createDateFrom, createDateTo (yyyy-MM-dd)
 */
test.describe('Date Range Filter', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page)
  })

  test('should display date input fields in search form', async ({ page }) => {
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: sampleInquiries.length,
        }),
      })
    )

    await page.goto('/#/inquiry/list')
    const dateInputs = page.locator('input[type="date"]')
    await expect(dateInputs).toHaveCount(2)
    await expect(page.getByText('作成日:')).toBeVisible()
    // From 〜 To の「〜」コネクタで期間であることを示す
    await expect(page.getByText('〜')).toBeVisible()
  })

  test('開始日 / 終了日の min・max が相互連動する（範囲バリデーション）', async ({
    page,
  }) => {
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: sampleInquiries.length,
        }),
      })
    )
    await page.goto('/#/inquiry/list')
    const dateInputs = page.locator('input[type="date"]')

    // 開始日を入れると終了日の min が開始日に連動（終了 < 開始 を選べない）
    await dateInputs.first().fill('2026-01-10')
    await expect(dateInputs.last()).toHaveAttribute('min', '2026-01-10')

    // 終了日を入れると開始日の max が終了日に連動（開始 > 終了 を選べない）
    await dateInputs.last().fill('2026-01-20')
    await expect(dateInputs.first()).toHaveAttribute('max', '2026-01-20')
  })

  test('should send createDateFrom parameter when from date is set', async ({
    page,
  }) => {
    const requests: string[] = []
    await page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: sampleInquiries.length,
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // 開始日のみ設定
    const dateInputs = page.locator('input[type="date"]')
    await dateInputs.first().fill('2026-01-01')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('createDateFrom=2026-01-01')
    expect(lastUrl).not.toContain('createDateTo')
  })

  test('should send createDateTo parameter when to date is set', async ({
    page,
  }) => {
    const requests: string[] = []
    await page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: sampleInquiries.length,
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // 終了日のみ設定
    const dateInputs = page.locator('input[type="date"]')
    await dateInputs.last().fill('2026-01-31')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).not.toContain('createDateFrom')
    expect(lastUrl).toContain('createDateTo=2026-01-31')
  })

  test('should send both date parameters when both are set', async ({
    page,
  }) => {
    const requests: string[] = []
    await page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: sampleInquiries.length,
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    const dateInputs = page.locator('input[type="date"]')
    await dateInputs.first().fill('2026-01-01')
    await dateInputs.last().fill('2026-01-31')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('createDateFrom=2026-01-01')
    expect(lastUrl).toContain('createDateTo=2026-01-31')
  })

  test('should not send date parameters when fields are empty', async ({
    page,
  }) => {
    const requests: string[] = []
    await page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: sampleInquiries.length,
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // 日付を入れずに検索をクリック
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).not.toContain('createDateFrom')
    expect(lastUrl).not.toContain('createDateTo')
  })

  test('should reset to page 1 when date filter changes', async ({ page }) => {
    const requests: string[] = []
    await page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: 45, // ページング表示に十分な件数
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    await expect(page.locator('.app-pagination')).toBeVisible()

    // 次ページ (2 ページ目) へ移動
    await page
      .locator('.app-pagination')
      .getByRole('button', { name: '次のページ' })
      .click()
    await page.waitForTimeout(500)

    // 日付フィルタを設定して検索
    const dateInputs = page.locator('input[type="date"]')
    await dateInputs.first().fill('2026-01-01')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    // offset=0 にリセットされるはず
    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('offset=0')
  })
})
