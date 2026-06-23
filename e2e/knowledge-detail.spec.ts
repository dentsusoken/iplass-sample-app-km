/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleKnowledgeDetail } from './helpers/mock-api'

test.describe('Knowledge Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page)

    await page.route('**/api/km/knowledge/detail/kb-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleKnowledgeDetail }),
      })
    )
  })

  test('should display name, content, and tags', async ({ page }) => {
    await page.goto('/#/knowledge/kb-001')
    await expect(page.getByText('Password Reset Guide')).toBeVisible()
    await expect(
      page.getByText('Follow these steps to reset your password')
    ).toBeVisible()
    await expect(page.getByText('Technical')).toBeVisible()
  })

  test('should display full details for responder role', async ({ page }) => {
    await page.goto('/#/knowledge/kb-001')

    // 関連問合せ
    await expect(page.getByText('Login issue on production')).toBeVisible()

    // 公開範囲バッジ (公開範囲は日本語表記)。
    // 公開範囲セクションでも「公開」が複数描画されるため、バッジに限定する。
    await expect(page.locator('.visibility-badge').first()).toHaveText('公開')

    // 編集ボタン
    await expect(page.getByRole('link', { name: '編集' })).toBeVisible()

    // 作成者と日付のフッター
    await expect(page.getByText('Support Staff')).toBeVisible()
  })

  test('should hide responder-only elements for questioner role', async ({
    page,
  }) => {
    // 質問者ロールで再セットアップ
    await setupCommonMocks(page, { roles: ['inquiry_user'] })

    await page.route('**/api/km/knowledge/detail/kb-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleKnowledgeDetail }),
      })
    )

    await page.goto('/#/knowledge/kb-001')

    // 基本フィールドが表示されること
    await expect(page.getByText('Password Reset Guide')).toBeVisible()
    await expect(
      page.getByText('Follow these steps to reset your password')
    ).toBeVisible()

    // 編集ボタンが表示されないこと
    await expect(page.getByRole('link', { name: '編集' })).not.toBeVisible()

    // 関連問合せが表示されないこと
    await expect(page.getByText('Login issue on production')).not.toBeVisible()

    // フッターが表示されないこと
    await expect(page.getByText('Support Staff')).not.toBeVisible()
  })

  test('should show error message when knowledge not found', async ({
    page,
  }) => {
    await page.route('**/api/km/knowledge/detail/kb-999', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          errorCode: 'NOT_FOUND',
          message: 'ナレッジが見つかりません',
        }),
      })
    )

    await page.goto('/#/knowledge/kb-999')
    // errorCode から辞書文言を解決する (サーバの生 message は表示しない)
    await expect(page.getByText('対象が見つかりません')).toBeVisible()
  })

  test('should navigate to edit page on edit button click', async ({
    page,
  }) => {
    await page.goto('/#/knowledge/kb-001')
    const editLink = page.getByRole('link', { name: '編集' })
    await expect(editLink).toBeVisible()
    await editLink.click()
    await page.waitForURL('**/knowledge/edit/kb-001')
    expect(page.url()).toContain('/#/knowledge/edit/kb-001')
  })
})
