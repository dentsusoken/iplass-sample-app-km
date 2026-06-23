/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'

/**
 * クローズ済み問合せでの投稿削除の統合テスト
 *
 * 「投稿の削除はクローズ済みの問合せでも可能（回答者による管理操作のため）」
 */
test.describe('Closed Inquiry Delete (real server)', () => {
  test.describe.configure({ mode: 'serial' })

  let inquiryOid: string

  test('should create inquiry and add a reply', async ({ page }) => {
    await login(page)

    // 問合せを作成
    await page.getByText('新規問合せ').click()
    await expect(page.getByText('新規問合せ作成')).toBeVisible()

    const title = `E2E Closed Delete ${Date.now()}`
    await page.locator('input[type="text"]').fill(title)
    await page.locator('textarea').fill('Initial post for closed delete test.')

    await page.getByText('問合せを送信').click()
    await page.waitForURL(/.*#\/inquiry\/(?!new$|list$)[^/]+$/, {
      timeout: 15000,
    })
    await page.waitForLoadState('networkidle')

    inquiryOid = page.url().split('/inquiry/').pop()!
    expect(inquiryOid).toBeTruthy()

    // 詳細画面が完全に描画されるのを待つ (ステータスバッジが表示される)
    await expect(page.locator('.status-badge')).toBeVisible({ timeout: 10000 })

    // 返信を追加する (後で削除する投稿になる)
    const textarea = page.locator('.chat-input__area')
    await expect(textarea).toBeVisible({ timeout: 10000 })
    await textarea.fill('Reply to be deleted on closed inquiry.')

    const sendBtn = page.locator('.chat-input__actions button')
    await expect(sendBtn).toBeEnabled({ timeout: 10000 })
    await sendBtn.click()

    await expect(
      page.getByText('Reply to be deleted on closed inquiry.')
    ).toBeVisible({ timeout: 10000 })
  })

  test('should close the inquiry', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    await page.getByText('解決済みにする').click()
    await expect(page.getByText('再オープン')).toBeVisible({ timeout: 10000 })

    // ステータスを検証（バッジ表示は i18n で言語可変のため data-status 属性で同定）
    await expect(
      page.locator('.status-badge[data-status="resolved"]')
    ).toBeVisible()
  })

  test('should still show delete button for responder on closed inquiry', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // クローズ済み問合せでも回答者には削除ボタンが表示されるはず
    await expect(
      page.locator('.post__actions').filter({ hasText: '削除' }).first()
    ).toBeVisible({ timeout: 10000 })

    // クローズ済み問合せでは編集ボタンが表示されないはず
    await expect(
      page.locator('.post__actions').filter({ hasText: '編集' })
    ).toHaveCount(0)
  })

  test('should successfully delete a post on closed inquiry', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 返信の投稿が表示されていることを確認
    await expect(
      page.getByText('Reply to be deleted on closed inquiry.')
    ).toBeVisible()

    // 確認ダイアログを承認する
    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })

    // 最後の投稿 (返信) の削除をクリック
    const deleteBtns = page
      .locator('.post__actions')
      .filter({ hasText: '削除' })
    await deleteBtns.last().click()

    // 投稿が消えるはず
    await expect(
      page.getByText('Reply to be deleted on closed inquiry.')
    ).not.toBeVisible({ timeout: 10000 })
  })

  test('should not show PostForm on closed inquiry', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // クローズ済み問合せでは投稿フォーム (textarea) が非表示になるはず
    await expect(page.locator('textarea')).not.toBeVisible()
  })
})
