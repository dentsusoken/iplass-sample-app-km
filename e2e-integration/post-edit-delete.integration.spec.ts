/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'

/**
 * 前提:
 * - testresponder ユーザ（inquiry_responder ロール）で実行
 * - Entity WebAPI DELETE が km.inquiry.Post に対して responder に許可されていること
 */
test.describe('Post Edit and Delete (real server)', () => {
  test.describe.configure({ mode: 'serial' })

  let inquiryOid: string

  test('should create inquiry with initial post', async ({ page }) => {
    await login(page)

    await page.getByText('新規問合せ').click()
    await expect(page.getByText('新規問合せ作成')).toBeVisible()

    const title = `Post Edit/Delete Test ${Date.now()}`
    await page.locator('input[type="text"]').fill(title)
    await page.locator('textarea').fill('Original post content for edit test.')

    await page.getByText('問合せを送信').click()
    await page.waitForURL(/.*#\/inquiry\/[^/]+$/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.chat-header__title')).toContainText(title, {
      timeout: 10000,
    })

    inquiryOid = page.url().split('/inquiry/').pop()!
    expect(inquiryOid).toBeTruthy()
  })

  test('should show edit button on own post', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // testresponder が問合せを作成したため、最初の投稿は本人のもの
    const editBtn = page.locator('.post__actions').filter({ hasText: '編集' })
    await expect(editBtn.first()).toBeVisible()
  })

  test('should edit post content', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 最初の投稿の編集をクリック
    await page
      .locator('.post__actions')
      .filter({ hasText: '編集' })
      .first()
      .click()

    // 編集カードが表示されるはず (警告ボーダー付き)
    const editCard = page.locator('.app-card').filter({ hasText: '投稿を編集' })
    await expect(editCard).toBeVisible()

    // 編集カード内の textarea に既存内容が入っているはず
    const editTextarea = editCard.locator('textarea')
    await expect(editTextarea).toBeVisible()
    const currentContent = await editTextarea.inputValue()
    expect(currentContent).toContain('Original post content')

    // クリアして新しい内容を入力
    await editTextarea.fill('Updated post content from E2E test.')

    // 編集カード内の更新ボタンをクリック
    await editCard.locator('button').filter({ hasText: '更新' }).click()

    // 詳細の再取得を待つ
    await page.waitForLoadState('networkidle')

    // 更新後の内容が投稿バブルに表示されるはず
    await expect(
      page.getByText('Updated post content from E2E test.')
    ).toBeVisible({ timeout: 10000 })

    // 編集済みインジケータが表示されるはず
    await expect(page.getByText('(編集済)')).toBeVisible()
  })

  test('should add a reply post for delete test', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    const textarea = page.locator('textarea').first()
    await textarea.fill('Reply to be deleted.')

    const sendBtn = page
      .locator('button')
      .filter({ hasText: /送信|投稿/ })
      .first()
    await sendBtn.click()

    await expect(page.getByText('Reply to be deleted.')).toBeVisible({
      timeout: 10000,
    })
  })

  test('should show delete button for responder', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 投稿が描画されるのを待つ
    await expect(page.locator('.post').first()).toBeVisible({ timeout: 5000 })

    // 回答者には投稿の削除ボタンが見えるはず
    const deleteBtn = page.locator('.post__actions').filter({ hasText: '削除' })
    await expect(deleteBtn.first()).toBeVisible({ timeout: 5000 })
  })

  test('should delete a post after confirmation', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 返信の投稿が存在することを確認
    await expect(page.getByText('Reply to be deleted.')).toBeVisible()

    // DELETE リクエストを監視してレスポンスボディを取得
    page.on('response', async (response) => {
      if (response.request().method() === 'DELETE') {
        let body = ''
        try {
          body = await response.text()
        } catch {
          /* 無視 */
        }
        // eslint-disable-next-line no-console
        console.log(
          `DELETE ${response.url()} → ${response.status()} body: ${body}`
        )
      }
    })

    // クリックする前に確認ダイアログを承認する
    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })

    // 返信の投稿の削除をクリック (最後の削除ボタン)
    const deleteBtns = page
      .locator('.post__actions')
      .filter({ hasText: '削除' })
    await deleteBtns.last().click()

    // 投稿が消えるのを待つ
    await expect(page.getByText('Reply to be deleted.')).not.toBeVisible({
      timeout: 10000,
    })
  })

  test('should hide edit buttons but keep delete for responder on closed inquiry', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 問合せをクローズ
    await page.getByText('解決済みにする').click()
    await expect(page.getByText('再オープン')).toBeVisible({ timeout: 10000 })

    // クローズ済み問合せでは編集ボタンが表示されないはず
    await expect(
      page.locator('.post__actions').filter({ hasText: '編集' })
    ).toHaveCount(0)

    // 削除ボタンは回答者には引き続き表示されるはず (管理操作)
    await expect(
      page.locator('.post__actions').filter({ hasText: '削除' })
    ).not.toHaveCount(0)
  })
})
