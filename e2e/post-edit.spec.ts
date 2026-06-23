/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiryDetail } from './helpers/mock-api'

/**
 * 投稿編集フローのモックE2Eテスト
 *
 * 仕様:
 * - ユーザーは自分の投稿を編集できる（isOwnPost && !isClosed）
 * - 回答者でも自分の投稿のみ編集可（削除は全投稿可）
 * - 編集ボタンクリック → インライン編集フォーム表示 → 保存/キャンセル
 * - 編集済みの投稿には「(編集済)」インジケータを表示（updateDate !== createDate）
 * - クローズ済み問合せでは編集ボタン非表示
 */
test.describe('Post Editing', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page)

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )

    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    )
  })

  test('should show edit form with current content when clicking edit', async ({
    page,
  }) => {
    await page.goto('/#/inquiry/inq-001')

    // post-001 は user-001 (現在のユーザー) の投稿
    await page
      .locator('.post__actions')
      .filter({ hasText: '編集' })
      .first()
      .click()

    // 「投稿を編集」ヘッダー付きの編集カードが表示されるはず
    const editCard = page.locator('.app-card').filter({ hasText: '投稿を編集' })
    await expect(editCard).toBeVisible()

    // textarea に元の投稿内容が入っているはず
    await expect(editCard.locator('textarea')).toHaveValue(
      'I cannot log in after resetting my password.'
    )

    // 送信ボタンに「更新」が表示されるはず
    await expect(editCard.getByText('更新')).toBeVisible()
  })

  test('should update post content on save', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await page
      .locator('.post__actions')
      .filter({ hasText: '編集' })
      .first()
      .click()

    const editCard = page.locator('.app-card').filter({ hasText: '投稿を編集' })

    // 新しい内容を入力
    await editCard.locator('textarea').fill('Updated: I still cannot log in.')

    // 更新 API をモックする
    await page.route('**/api/km/inquiry/post/update/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SUCCESS' }),
      })
    )

    // 更新後の内容で再取得をモックする
    const updatedDetail = {
      ...sampleInquiryDetail,
      posts: [
        {
          ...sampleInquiryDetail.posts[0],
          content: 'Updated: I still cannot log in.',
          updateDate: '2026-01-15T12:00:00Z',
        },
        sampleInquiryDetail.posts[1],
      ],
    }
    await page.unroute('**/api/km/inquiry/detail/inq-001')
    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: updatedDetail }),
      })
    )

    // 保存をクリック
    await editCard.getByText('更新').click()

    // 編集フォームが閉じるはず
    await expect(editCard).not.toBeVisible()

    // 更新後の内容が表示されるはず
    await expect(
      page.getByText('Updated: I still cannot log in.')
    ).toBeVisible()
  })

  test('should close edit form on cancel', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await page
      .locator('.post__actions')
      .filter({ hasText: '編集' })
      .first()
      .click()

    const editCard = page.locator('.app-card').filter({ hasText: '投稿を編集' })
    await expect(editCard).toBeVisible()

    // 閉じるボタン (×) をクリック
    await editCard.locator('.btn-close').click()

    // 編集フォームが消えるはず
    await expect(editCard).not.toBeVisible()

    // 元の内容は変わらないまま
    await expect(
      page.getByText('I cannot log in after resetting my password.')
    ).toBeVisible()
  })

  test('should show edited indicator when updateDate differs from createDate', async ({
    page,
  }) => {
    const editedDetail = {
      ...sampleInquiryDetail,
      posts: [
        {
          ...sampleInquiryDetail.posts[0],
          updateDate: '2026-01-15T12:00:00Z', // createDate と異なる
        },
        sampleInquiryDetail.posts[1],
      ],
    }

    await page.unroute('**/api/km/inquiry/detail/inq-001')
    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: editedDetail }),
      })
    )

    await page.goto('/#/inquiry/inq-001')

    // 編集済みの投稿に「(編集済)」が表示されるはず
    await expect(page.getByText('(編集済)').first()).toBeVisible()
  })

  test('should not show edited indicator on unedited posts', async ({
    page,
  }) => {
    await page.goto('/#/inquiry/inq-001')

    // どちらの投稿も updateDate === createDate なのでインジケータなし
    await expect(page.getByText('(編集済)')).not.toBeVisible()
  })

  test('should not show edit button on other user posts', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')

    // post-002 は user-003 (Support Staff) の投稿で現在のユーザーではない
    const secondPost = page.locator('.post').nth(1)
    await expect(
      secondPost.locator('.post__actions').filter({ hasText: '編集' })
    ).toHaveCount(0)
  })

  test('should show error message on update failure', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await page
      .locator('.post__actions')
      .filter({ hasText: '編集' })
      .first()
      .click()

    const editCard = page.locator('.app-card').filter({ hasText: '投稿を編集' })
    await editCard.locator('textarea').fill('Updated content')

    // 更新失敗をモックする
    await page.route('**/api/km/inquiry/post/update/**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ERROR',
          message: 'Server error',
        }),
      })
    )

    await editCard.getByText('更新').click()

    // エラーメッセージが表示されるはず
    await expect(page.locator('.alert-danger')).toBeVisible()
  })

  test('should hide edit button on closed inquiry', async ({ page }) => {
    const closedDetail = {
      ...sampleInquiryDetail,
      status: 'Resolved',
      closedDate: '2026-01-20T15:00:00Z',
    }

    await page.unroute('**/api/km/inquiry/detail/inq-001')
    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: closedDetail }),
      })
    )

    await page.goto('/#/inquiry/inq-001')

    // 編集ボタンが表示されないはず (isClosed === true)
    await expect(
      page.locator('.post__actions').filter({ hasText: '編集' })
    ).toHaveCount(0)
  })
})
