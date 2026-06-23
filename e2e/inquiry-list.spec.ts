/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiries } from './helpers/mock-api'

test.describe('Inquiry List Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page)

    // 問合せ一覧をモックする
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
  })

  test('should display page title and total count', async ({ page }) => {
    await page.goto('/#/inquiry/list')
    await expect(
      page.locator('.list-header__title', { hasText: '問合せ一覧' })
    ).toBeVisible()
    await expect(
      page.getByText(`全 ${sampleInquiries.length} 件`)
    ).toBeVisible()
  })

  test('should display inquiry rows in the table', async ({ page }) => {
    await page.goto('/#/inquiry/list')
    await expect(page.getByText('Login issue on production')).toBeVisible()
    await expect(page.getByText('Billing question')).toBeVisible()
    await expect(page.getByText('Feature request: dark mode')).toBeVisible()
  })

  test('should display status badges', async ({ page }) => {
    await page.goto('/#/inquiry/list')
    await expect(
      page.locator('.status-badge[data-status="open"]')
    ).toBeVisible()
    await expect(
      page.locator('.status-badge[data-status="answered"]')
    ).toBeVisible()
    await expect(
      page.locator('.status-badge[data-status="resolved"]')
    ).toBeVisible()
  })

  test('should display tag badges', async ({ page }) => {
    await page.goto('/#/inquiry/list')
    await expect(
      page.locator('.tag-badge').getByText('Technical')
    ).toBeVisible()
    await expect(page.locator('.tag-badge').getByText('Billing')).toBeVisible()
  })

  test('should have new inquiry button', async ({ page }) => {
    await page.goto('/#/inquiry/list')
    await expect(page.getByText('新規問合せ')).toBeVisible()
  })

  test('should navigate to new inquiry page on button click', async ({
    page,
  }) => {
    await page.goto('/#/inquiry/list')
    await page.getByText('新規問合せ').click()
    await expect(page).toHaveURL(/#\/inquiry\/new/)
  })

  test('should navigate to inquiry detail on row click', async ({ page }) => {
    // 遷移先の詳細 API をモックする
    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { ...sampleInquiries[0], posts: [] } }),
      })
    )

    await page.goto('/#/inquiry/list')
    await page.getByText('Login issue on production').click()
    await expect(page).toHaveURL(/#\/inquiry\/inq-001/)
  })

  test('should show empty state when no inquiries', async ({ page }) => {
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], totalCount: 0 }),
      })
    )

    await page.goto('/#/inquiry/list')
    await expect(page.getByText('問合せがありません')).toBeVisible()
  })

  test('should display search form', async ({ page }) => {
    await page.goto('/#/inquiry/list')
    // 検索フォームが表示されること (InquirySearchForm コンポーネント)
    await expect(page.locator('input, select').first()).toBeVisible()
  })
})
