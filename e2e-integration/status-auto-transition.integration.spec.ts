/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'

/**
 * ステータス自動遷移の統合テスト
 *
 * - Open → Answered: 回答者が投稿を追加した時に自動遷移
 * - Answered → Open: ユーザが投稿を追加した時に自動遷移
 * - その他の組み合わせ: ステータス変更なし
 *
 * 前提: testuser/testuser (inquiry_user), testresponder/testresponder (inquiry_responder)
 */
test.describe('Status Auto-Transition (real server)', () => {
  test.describe.configure({ mode: 'serial' })

  let inquiryOid: string

  test('testuser creates an inquiry (status: Open)', async ({ page }) => {
    await login(page, 'testuser', 'testuser')

    await page.getByText('新規問合せ').click()
    await expect(page.getByText('新規問合せ作成')).toBeVisible()

    const title = `E2E Status Transition ${Date.now()}`
    await page.locator('input[type="text"]').fill(title)
    await page.locator('textarea').fill('Testing status auto-transition.')

    await page.getByText('問合せを送信').click()
    await page.waitForURL(/.*#\/inquiry\/(?!new$|list$)[^/]+$/, {
      timeout: 15000,
    })
    await page.waitForLoadState('networkidle')

    inquiryOid = page.url().split('/inquiry/').pop()!
    expect(inquiryOid).toBeTruthy()

    // ステータスは Open のはず
    await expect(page.locator('.status-badge[data-status="open"]')).toBeVisible(
      {
        timeout: 10000,
      }
    )
  })

  test('testresponder posts a reply -> status transitions to Answered', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 現在のステータスが Open であることを確認
    await expect(page.locator('.status-badge[data-status="open"]')).toBeVisible(
      {
        timeout: 10000,
      }
    )

    // 回答者が返信を投稿
    await page.locator('textarea').first().fill('Responder reply 1.')
    await page
      .locator('button')
      .filter({ hasText: /送信|投稿/ })
      .first()
      .click()

    // ステータスが Answered に遷移するはず
    await expect(
      page.locator('.status-badge[data-status="answered"]')
    ).toBeVisible({ timeout: 10000 })
  })

  test('testuser posts a reply -> status transitions back to Open', async ({
    page,
  }) => {
    await login(page, 'testuser', 'testuser')
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 現在のステータスが Answered であることを確認
    await expect(
      page.locator('.status-badge[data-status="answered"]')
    ).toBeVisible({ timeout: 10000 })

    // 利用者が返信を投稿
    await page.locator('textarea').first().fill('User reply 1.')
    await page
      .locator('button')
      .filter({ hasText: /送信|投稿/ })
      .first()
      .click()

    // ステータスが Open に戻るはず
    await expect(page.locator('.status-badge[data-status="open"]')).toBeVisible(
      {
        timeout: 10000,
      }
    )
  })

  test('testuser posts again -> status stays Open (no change)', async ({
    page,
  }) => {
    await login(page, 'testuser', 'testuser')
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 現在のステータスが Open であることを確認
    await expect(page.locator('.status-badge[data-status="open"]')).toBeVisible(
      {
        timeout: 10000,
      }
    )

    // 利用者が再度投稿
    await page.locator('textarea').first().fill('User reply 2.')
    await page
      .locator('button')
      .filter({ hasText: /送信|投稿/ })
      .first()
      .click()

    // 投稿が表示されるのを待つ
    await expect(page.getByText('User reply 2.')).toBeVisible({
      timeout: 10000,
    })

    // ステータスは Open のままのはず
    await expect(page.locator('.status-badge[data-status="open"]')).toBeVisible(
      {
        timeout: 10000,
      }
    )
  })

  test('testresponder posts -> status transitions to Answered', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    await page.locator('textarea').first().fill('Responder reply 2.')
    await page
      .locator('button')
      .filter({ hasText: /送信|投稿/ })
      .first()
      .click()

    await expect(
      page.locator('.status-badge[data-status="answered"]')
    ).toBeVisible({ timeout: 10000 })
  })

  test('testresponder posts again -> status stays Answered (no change)', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 現在のステータスが Answered であることを確認
    await expect(
      page.locator('.status-badge[data-status="answered"]')
    ).toBeVisible({ timeout: 10000 })

    await page.locator('textarea').first().fill('Responder reply 3.')
    await page
      .locator('button')
      .filter({ hasText: /送信|投稿/ })
      .first()
      .click()

    // 投稿が表示されるのを待つ
    await expect(page.getByText('Responder reply 3.')).toBeVisible({
      timeout: 10000,
    })

    // ステータスは Answered のままのはず
    await expect(
      page.locator('.status-badge[data-status="answered"]')
    ).toBeVisible({ timeout: 10000 })
  })
})
