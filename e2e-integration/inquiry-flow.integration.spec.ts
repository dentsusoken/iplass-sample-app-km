/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'

test.describe('Inquiry full lifecycle (real server)', () => {
  test.describe.configure({ mode: 'serial' })

  let inquiryOid: string

  test('should create a new inquiry', async ({ page }) => {
    await login(page)

    // 新規問合せフォームへ移動
    await page.getByText('新規問合せ').click()
    await expect(page.getByText('新規問合せ作成')).toBeVisible()

    // フォームに入力
    const title = `E2E Test Inquiry ${Date.now()}`
    await page.locator('input[type="text"]').fill(title)
    await page
      .locator('textarea')
      .fill('This is an automated E2E test inquiry.')

    // 送信
    const submitBtn = page.getByText('問合せを送信')
    await expect(submitBtn).toBeEnabled()
    await submitBtn.click()

    // 新しい問合せのチャット画面へ遷移するはず
    await page.waitForURL(/.*#\/inquiry\/[^/]+$/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.chat-header__title')).toContainText(title, {
      timeout: 10000,
    })

    // 後続テスト用に URL から OID を取り出す
    const url = page.url()
    inquiryOid = url.split('/inquiry/').pop()!
    expect(inquiryOid).toBeTruthy()
  })

  test('should display the new inquiry in the chat view', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // タイトルとステータスが表示されるはず
    await expect(page.locator('.chat-header__title')).toBeVisible()
    await expect(page.locator('.status-badge')).toBeVisible()

    // 最初の投稿 (問合せ本文) が表示されるはず
    await expect(
      page.getByText('This is an automated E2E test inquiry.')
    ).toBeVisible()
  })

  test('should post a reply', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 投稿フォームに返信を入力
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible()
    await textarea.fill('Reply from E2E integration test.')

    // 返信を送信
    const sendBtn = page
      .locator('button')
      .filter({ hasText: /送信|投稿/ })
      .first()
    await sendBtn.click()

    // 新しい投稿が表示されるのを待つ
    await expect(
      page.getByText('Reply from E2E integration test.')
    ).toBeVisible({ timeout: 10000 })
  })

  test('should show tag edit button for responder', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // testresponder は inquiry_responder ロールを持つ
    await expect(page.getByText('タグ編集')).toBeVisible()
  })

  test('should close inquiry as resolved', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 解決ボタンをクリック
    await page.getByText('解決済みにする').click()

    // 代わりに再オープンボタンが表示されるはず
    await expect(page.getByText('再オープン')).toBeVisible({ timeout: 10000 })
    // 解決済み問合せでは投稿フォームが非表示になるはず
    await expect(page.locator('textarea')).not.toBeVisible()
  })

  test('should reopen the resolved inquiry', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    await page.getByText('再オープン').click()

    // 解決済み/キャンセルボタンが再表示されるはず
    await expect(page.getByText('解決済みにする')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('textarea').first()).toBeVisible()
  })

  test('should cancel the inquiry', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // ヘッダーのキャンセルボタンを探す (フォームのキャンセルではない)
    const cancelBtn = page
      .locator('.chat-header__right button')
      .filter({ hasText: 'キャンセル' })
    await cancelBtn.click()

    // 再オープンボタンが表示されるはず (Canceled 状態)
    await expect(page.getByText('再オープン')).toBeVisible({ timeout: 10000 })
  })
})
