/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiryDetail } from './helpers/mock-api'

/**
 * 投稿削除のモックE2Eテスト
 *
 * 仕様:
 * - 回答者（inquiry_responder）のみ削除ボタンを表示
 * - 削除はiPLAss標準Entity API（DELETE /api/mtp/entity/km.inquiry.Post/{oid}）を使用
 * - 確認ダイアログ「この投稿を削除しますか？」→ OK で削除実行
 * - 確認ダイアログ → キャンセルで削除中止（※ inquiry-chat.spec.ts で検証済み）
 * - 削除後、問合せ詳細を再取得して投稿リストを更新
 * - クローズ済み問合せでも削除ボタンは回答者に表示される
 */
test.describe('Post Deletion', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, { roles: ['inquiry_responder'] })

    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    )
  })

  test('should delete post after confirmation and remove from list', async ({
    page,
  }) => {
    let deleteApiCalled = false

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )

    // Entity API の DELETE をモックする
    await page.route('**/api/mtp/entity/km.inquiry.Post/post-002', (route) => {
      deleteApiCalled = true
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SUCCESS' }),
      })
    })

    // 確認ダイアログを承認する
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('この投稿を削除しますか？')
      await dialog.accept()
    })

    await page.goto('/#/inquiry/inq-001')

    // 初期状態で投稿が 2 件あることを確認
    await expect(page.locator('.post')).toHaveCount(2)
    await expect(
      page.getByText('Please try clearing your browser cache and cookies.')
    ).toBeVisible()

    // 削除後の再取得をモックする: 最初の投稿のみ残る
    await page.unroute('**/api/km/inquiry/detail/inq-001')
    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            ...sampleInquiryDetail,
            posts: [sampleInquiryDetail.posts[0]],
          },
        }),
      })
    )

    // 2 番目の投稿の削除をクリック
    await page
      .locator('.post__actions')
      .filter({ hasText: '削除' })
      .nth(1)
      .click()

    // 再取得を待つ
    await page.waitForTimeout(500)

    // 削除 API が呼ばれたはず
    expect(deleteApiCalled).toBe(true)

    // 残る投稿は 1 件だけのはず
    await expect(page.locator('.post')).toHaveCount(1)
    await expect(
      page.getByText('Please try clearing your browser cache and cookies.')
    ).not.toBeVisible()
  })

  test('should show error message on delete failure', async ({ page }) => {
    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )

    await page.route('**/api/mtp/entity/km.inquiry.Post/**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ERROR',
          message: 'Server error',
        }),
      })
    )

    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })

    await page.goto('/#/inquiry/inq-001')
    await page
      .locator('.post__actions')
      .filter({ hasText: '削除' })
      .first()
      .click()

    // エラーメッセージが表示されるはず
    await expect(page.locator('.alert-danger')).toBeVisible()
  })

  test('should show delete button on closed inquiry for responder', async ({
    page,
  }) => {
    const closedDetail = {
      ...sampleInquiryDetail,
      status: 'Resolved',
      closedDate: '2026-01-20T15:00:00Z',
    }

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: closedDetail }),
      })
    )

    await page.goto('/#/inquiry/inq-001')

    // クローズ済み問合せでも回答者には削除ボタンが表示されるはず
    await expect(
      page.locator('.post__actions').filter({ hasText: '削除' }).first()
    ).toBeVisible()
  })

  test('should not show delete button for regular user', async ({ page }) => {
    await setupCommonMocks(page, { roles: ['inquiry_user'] })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )

    await page.goto('/#/inquiry/inq-001')

    // 一般利用者には削除ボタンが表示されない
    await expect(
      page.locator('.post__actions').filter({ hasText: '削除' })
    ).toHaveCount(0)
  })
})
