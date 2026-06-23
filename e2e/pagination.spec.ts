/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiries } from './helpers/mock-api'

/** ページングテスト用に N 件の問合せ項目を生成する */
function generateInquiries(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    ...sampleInquiries[0],
    oid: `inq-${String(i + 1).padStart(3, '0')}`,
    name: `Inquiry ${i + 1}`,
  }))
}

test.describe('Pagination', () => {
  test('should not show pagination when totalCount <= 20', async ({ page }) => {
    await setupCommonMocks(page)
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateInquiries(3),
          totalCount: 3,
        }),
      })
    )

    await page.goto('/#/inquiry/list')
    await expect(page.getByText('全 3 件')).toBeVisible()
    await expect(page.locator('.app-pagination')).not.toBeVisible()
  })

  test('should show pagination when totalCount > 20', async ({ page }) => {
    await setupCommonMocks(page)
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateInquiries(20),
          totalCount: 45,
        }),
      })
    )

    await page.goto('/#/inquiry/list')
    await expect(page.getByText('全 45 件')).toBeVisible()
    await expect(page.locator('.app-pagination')).toBeVisible()
  })

  test('should display correct page numbers (max 5 visible)', async ({
    page,
  }) => {
    await setupCommonMocks(page)
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateInquiries(20),
          totalCount: 200, // 10 ページ分
        }),
      })
    )

    await page.goto('/#/inquiry/list')
    const pagination = page.locator('.app-pagination')
    await expect(pagination).toBeVisible()

    // ページ番号ボタン (アクセシブル名が数字) は最大 5 個。
    // 先頭/前/次/末尾の各ナビは aria-label を持つため数字名には一致しない
    const pageButtons = pagination.getByRole('button', { name: /^\d+$/ })
    expect(await pageButtons.count()).toBeLessThanOrEqual(5)
  })

  test('should highlight current page', async ({ page }) => {
    await setupCommonMocks(page)
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateInquiries(20),
          totalCount: 45,
        }),
      })
    )

    await page.goto('/#/inquiry/list')
    const activeBtn = page.locator('.app-pagination__btn--active')
    await expect(activeBtn).toBeVisible()
    await expect(activeBtn).toHaveText('1')
  })

  test('should navigate to next page on >> click', async ({ page }) => {
    await setupCommonMocks(page)

    const requests: string[] = []
    await page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateInquiries(20),
          totalCount: 45,
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    await expect(page.locator('.app-pagination')).toBeVisible()

    // 次ページボタンをクリック
    const nextBtn = page
      .locator('.app-pagination')
      .getByRole('button', { name: '次のページ' })
    await nextBtn.click()

    // 新しいリクエストを待つ
    await page.waitForTimeout(500)

    // 最後のリクエストは offset=20 を持つはず
    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('offset=20')
  })

  test('should navigate to previous page on << click', async ({ page }) => {
    await setupCommonMocks(page)

    const requests: string[] = []
    await page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateInquiries(20),
          totalCount: 45,
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    await expect(page.locator('.app-pagination')).toBeVisible()

    const pagination = page.locator('.app-pagination')
    // まず 2 ページ目へ移動
    await pagination.getByRole('button', { name: '次のページ' }).click()
    await page.waitForTimeout(500)

    // 次に前ページボタンをクリック
    await pagination.getByRole('button', { name: '前のページ' }).click()
    await page.waitForTimeout(500)

    // 最後のリクエストは offset=0 を持つはず
    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('offset=0')
  })

  test('should disable << on first page', async ({ page }) => {
    await setupCommonMocks(page)
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateInquiries(20),
          totalCount: 45,
        }),
      })
    )

    await page.goto('/#/inquiry/list')
    const prevBtn = page
      .locator('.app-pagination')
      .getByRole('button', { name: '前のページ' })
    await expect(prevBtn).toBeDisabled()
  })

  test('should disable >> on last page', async ({ page }) => {
    await setupCommonMocks(page)

    let requestCount = 0
    await page.route('**/api/km/inquiry/list*', (route) => {
      requestCount++
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateInquiries(requestCount === 1 ? 20 : 5),
          totalCount: 25, // 2 ページ分
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    await expect(page.locator('.app-pagination')).toBeVisible()

    const pagination = page.locator('.app-pagination')
    // 最終ページ (2 ページ目) へ移動
    const nextBtn = pagination.getByRole('button', { name: '次のページ' })
    await nextBtn.click()
    await page.waitForTimeout(500)

    // 最終ページでは次ページボタンが無効になるはず
    await expect(nextBtn).toBeDisabled()
  })

  test('should reset to page 1 when search conditions change', async ({
    page,
  }) => {
    await setupCommonMocks(page)

    const requests: string[] = []
    await page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateInquiries(20),
          totalCount: 45,
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    await expect(page.locator('.app-pagination')).toBeVisible()

    // 2 ページ目へ移動
    await page
      .locator('.app-pagination')
      .getByRole('button', { name: '次のページ' })
      .click()
    await page.waitForTimeout(500)

    // 検索条件を変更する (MultiSelectDropdown でステータスフィルタを選択)
    const statusDropdown = page.locator('.multi-select').first()
    await statusDropdown.locator('button.multi-select__trigger').click()
    await statusDropdown
      .locator('.multi-select__option', { hasText: 'オープン' })
      .click()
    await page.locator('body').click({ position: { x: 0, y: 0 } })
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    // 最後のリクエストは offset=0 を持つはず (1 ページ目にリセット)
    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('offset=0')
  })

  test('should send correct offset parameter for page 2', async ({ page }) => {
    await setupCommonMocks(page)

    const requests: string[] = []
    await page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateInquiries(20),
          totalCount: 60, // 3 ページ分
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    await expect(page.locator('.app-pagination')).toBeVisible()

    // ページ番号「2」を直接クリック
    await page.locator('.app-pagination__btn').filter({ hasText: '2' }).click()
    await page.waitForTimeout(500)

    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('offset=20')
    expect(lastUrl).toContain('limit=20')
  })
})
