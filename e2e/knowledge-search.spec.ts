/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import {
  setupCommonMocks,
  sampleInquiryDetail,
  sampleKnowledge,
} from './helpers/mock-api'

/**
 * 問合せチャットのサイドパネルに表示されるキーワード検索 UI を検証する。
 * 検索入力・結果表示・空状態・タグ表示・詳細遷移・エラー表示を mock でカバーする。
 */
test.describe('Knowledge Search Panel', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page)

    // 問合せ詳細をモックする (ナレッジパネルはチャット画面にある)
    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )
  })

  test('should display knowledge panel with placeholder text', async ({
    page,
  }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('関連ナレッジ')).toBeVisible()
    await expect(page.getByText('キーワードを入力して検索')).toBeVisible()
  })

  test('should have a search input', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByPlaceholder('ナレッジを検索...')).toBeVisible()
  })

  test('should display search results after search', async ({ page }) => {
    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleKnowledge }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    const searchInput = page.getByPlaceholder('ナレッジを検索...')
    await searchInput.fill('password')
    await searchInput.press('Enter')

    await expect(page.getByText('Password Reset Guide')).toBeVisible()
    await expect(
      page.getByText('Browser Cache Clearing Instructions')
    ).toBeVisible()
  })

  test('should show no results message when search returns empty', async ({
    page,
  }) => {
    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    const searchInput = page.getByPlaceholder('ナレッジを検索...')
    await searchInput.fill('nonexistent topic')
    await searchInput.press('Enter')

    await expect(page.getByText('該当するナレッジがありません')).toBeVisible()
  })

  test('should display tag badges on knowledge results', async ({ page }) => {
    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleKnowledge }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    const searchInput = page.getByPlaceholder('ナレッジを検索...')
    await searchInput.fill('password')
    await searchInput.press('Enter')

    // ナレッジ項目にタグが表示されること
    const technicalTags = page.locator('.tag-badge', { hasText: 'Technical' })
    await expect(technicalTags.first()).toBeVisible()
  })

  test('should open knowledge detail in a new tab on click', async ({
    page,
    context,
  }) => {
    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleKnowledge }),
      })
    )

    await page.route('**/api/km/knowledge/detail/kb-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleKnowledge[0] }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    const searchInput = page.getByPlaceholder('ナレッジを検索...')
    await searchInput.fill('password')
    await searchInput.press('Enter')

    await expect(page.getByText('Password Reset Guide')).toBeVisible()

    // 最初のナレッジ結果をクリックして新しいタブを待つ
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('.knowledge-item').first().click(),
    ])

    // 元のページは問合せチャットのままであること
    expect(page.url()).toContain('/#/inquiry/inq-001')
    // 新しいタブはナレッジ詳細へ遷移するはず
    await newPage.waitForURL('**/knowledge/kb-001')
    expect(newPage.url()).toContain('/#/knowledge/kb-001')
  })

  test('should show error message on search failure', async ({ page }) => {
    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          errorCode: 'SERVER_ERROR',
          message: '検索に失敗しました',
        }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    const searchInput = page.getByPlaceholder('ナレッジを検索...')
    await searchInput.fill('test')
    await searchInput.press('Enter')

    await expect(page.getByText('検索に失敗しました')).toBeVisible()
  })
})
