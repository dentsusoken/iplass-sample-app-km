/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks } from './helpers/mock-api'

test.describe('Knowledge Search Navigation', () => {
  test('should show knowledge search link in navbar for all users', async ({
    page,
  }) => {
    await setupCommonMocks(page, { roles: ['inquiry_user'] })
    // エラー防止のため問合せ一覧をモックする
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          totalCount: 0,
          offset: 0,
          limit: 20,
        }),
      })
    )
    await page.goto('/#/inquiry/list')
    await expect(page.getByRole('link', { name: 'ナレッジ検索' })).toBeVisible()
  })

  test('should navigate to knowledge search page on click', async ({
    page,
  }) => {
    await setupCommonMocks(page)
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          totalCount: 0,
          offset: 0,
          limit: 20,
        }),
      })
    )
    await page.goto('/#/inquiry/list')
    await page.getByRole('link', { name: 'ナレッジ検索' }).click()
    await expect(page).toHaveURL(/.*#\/knowledge\/search/)
  })

  test('should show knowledge search link for responder', async ({ page }) => {
    await setupCommonMocks(page, { roles: ['inquiry_responder'] })
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          totalCount: 0,
          offset: 0,
          limit: 20,
        }),
      })
    )
    await page.goto('/#/inquiry/list')
    await expect(page.getByRole('link', { name: 'ナレッジ検索' })).toBeVisible()
  })

  test('should show inquiry list link in navbar', async ({ page }) => {
    await setupCommonMocks(page)
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          totalCount: 0,
          offset: 0,
          limit: 20,
        }),
      })
    )
    await page.goto('/#/inquiry/list')
    await expect(page.getByRole('link', { name: '問合せ一覧' })).toBeVisible()
  })

  test('should highlight active nav link', async ({ page }) => {
    await setupCommonMocks(page)
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          totalCount: 0,
          offset: 0,
          limit: 20,
        }),
      })
    )
    await page.goto('/#/inquiry/list')
    const inquiryLink = page.getByRole('link', { name: '問合せ一覧' })
    await expect(inquiryLink).toHaveClass(/router-link-active/)
  })
})
