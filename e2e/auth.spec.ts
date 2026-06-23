/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiryDetail } from './helpers/mock-api'

test.describe('Authorization - Responder Role', () => {
  test.beforeEach(async ({ page }) => {
    // 回答者ロール付きでセットアップ
    await setupCommonMocks(page, { roles: ['inquiry_responder'] })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )
  })

  test('responder should see tag edit button', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('タグ編集')).toBeVisible()
  })

  test('responder should see close/cancel buttons for open inquiry', async ({
    page,
  }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('解決済みにする')).toBeVisible()
    await expect(page.getByText('キャンセル').last()).toBeVisible()
  })
})

test.describe('Authorization - Regular User (No Responder Role)', () => {
  test.beforeEach(async ({ page }) => {
    // 回答者ロールなしでセットアップ
    await setupCommonMocks(page, { roles: [] })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )
  })

  test('regular user should NOT see tag edit button', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    // 画面の読み込み完了を待つ
    await expect(
      page.locator('.chat-header__title').getByText('Login issue on production')
    ).toBeVisible()
    await expect(page.getByText('タグ編集')).not.toBeVisible()
  })

  test('regular user should still see close/cancel buttons', async ({
    page,
  }) => {
    // クローズ/キャンセルは全ユーザーが利用でき、ロールで制限しない
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('解決済みにする')).toBeVisible()
  })
})

test.describe('Authorization - Role-based UI on Resolved Inquiry', () => {
  const resolvedInquiry = {
    ...sampleInquiryDetail,
    status: 'Resolved' as const,
    closedDate: '2026-01-20T15:00:00Z',
  }

  test('responder should see reopen button on resolved inquiry', async ({
    page,
  }) => {
    await setupCommonMocks(page, { roles: ['inquiry_responder'] })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: resolvedInquiry }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('再オープン')).toBeVisible()
    // クローズ済み問合せでは投稿フォームが表示されないこと
    await expect(page.locator('textarea')).not.toBeVisible()
  })

  test('regular user should see reopen button on resolved inquiry', async ({
    page,
  }) => {
    await setupCommonMocks(page, { roles: [] })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: resolvedInquiry }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('再オープン')).toBeVisible()
  })
})
