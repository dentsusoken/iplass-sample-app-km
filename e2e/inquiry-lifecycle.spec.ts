/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiryDetail } from './helpers/mock-api'

/**
 * 問合せライフサイクル（クローズ・再オープン）のモックE2Eテスト
 *
 * 仕様（ステータス遷移）:
 * - Open/Answered → Resolved（解決済み）: closedDate に現在日時を自動設定
 * - Open/Answered → Canceled（キャンセル）: closedDate に現在日時を自動設定
 * - Resolved/Canceled → Open（再オープン）: closedDate をnullリセット
 *
 * UI変化:
 * - クローズ後: 投稿フォーム非表示、「再オープン」ボタン表示
 * - 再オープン後: 投稿フォーム表示、「解決済みにする」「キャンセル」ボタン表示
 */
test.describe('Inquiry Lifecycle - Close as Canceled', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page)

    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    )
  })

  test('should close inquiry as canceled and update UI', async ({ page }) => {
    let closePayload: any = null

    await page.route('**/api/km/inquiry/close/inq-001', (route) => {
      closePayload = route.request().postDataJSON()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SUCCESS' }),
      })
    })

    // 初回読み込みは Open、クローズ後は Canceled
    let closeRequested = false
    await page.route('**/api/km/inquiry/detail/inq-001', (route) => {
      if (closeRequested) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              ...sampleInquiryDetail,
              status: 'Canceled',
              closedDate: '2026-01-20T15:00:00Z',
            },
          }),
        })
      }
      closeRequested = true
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    })

    await page.goto('/#/inquiry/inq-001')
    await expect(
      page.locator('.status-badge[data-status="open"]')
    ).toBeVisible()

    // キャンセルボタンをクリック
    await page.locator('.chat-header__right').getByText('キャンセル').click()

    // ステータスが Canceled に変わるはず
    await expect(
      page.locator('.status-badge[data-status="canceled"]')
    ).toBeVisible()

    // 投稿フォームが非表示になるはず
    await expect(page.locator('.chat-input__area')).not.toBeVisible()

    // 再オープンボタンが表示されるはず
    await expect(page.getByText('再オープン')).toBeVisible()

    // API ペイロードを検証
    expect(closePayload).toEqual({ resolution: 'canceled' })
  })

  test('should show error message on close failure', async ({ page }) => {
    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )

    await page.route('**/api/km/inquiry/close/inq-001', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ERROR',
          message: 'Server error',
        }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    await page.getByText('解決済みにする').click()

    await expect(page.locator('.alert-danger')).toBeVisible()
  })
})

test.describe('Inquiry Lifecycle - Reopen', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page)

    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    )
  })

  test('should reopen resolved inquiry and restore UI', async ({ page }) => {
    const resolvedDetail = {
      ...sampleInquiryDetail,
      status: 'Resolved',
      closedDate: '2026-01-20T15:00:00Z',
    }

    await page.route('**/api/km/inquiry/reopen/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SUCCESS' }),
      })
    )

    // 初回読み込みは Resolved、再オープン後は Open
    let reopenRequested = false
    await page.route('**/api/km/inquiry/detail/inq-001', (route) => {
      if (reopenRequested) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              ...sampleInquiryDetail,
              status: 'Open',
              closedDate: null,
            },
          }),
        })
      }
      reopenRequested = true
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: resolvedDetail }),
      })
    })

    await page.goto('/#/inquiry/inq-001')

    // 初期状態: Resolved ステータス、投稿フォームなし、再オープンボタン表示
    await expect(
      page.locator('.status-badge[data-status="resolved"]')
    ).toBeVisible()
    await expect(page.locator('.chat-input__area')).not.toBeVisible()
    await expect(page.getByText('再オープン')).toBeVisible()

    // 再オープンをクリック
    await page.getByText('再オープン').click()

    // ステータスが Open に変わるはず
    await expect(
      page.locator('.status-badge[data-status="open"]')
    ).toBeVisible()

    // 投稿フォームが再表示されるはず
    await expect(page.locator('.chat-input__area')).toBeVisible()

    // 解決済み/キャンセルボタンが再表示されるはず
    await expect(page.getByText('解決済みにする')).toBeVisible()
  })

  test('should reopen canceled inquiry', async ({ page }) => {
    const canceledDetail = {
      ...sampleInquiryDetail,
      status: 'Canceled',
      closedDate: '2026-01-20T15:00:00Z',
    }

    await page.route('**/api/km/inquiry/reopen/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SUCCESS' }),
      })
    )

    let reopenRequested = false
    await page.route('**/api/km/inquiry/detail/inq-001', (route) => {
      if (reopenRequested) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { ...sampleInquiryDetail, status: 'Open', closedDate: null },
          }),
        })
      }
      reopenRequested = true
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: canceledDetail }),
      })
    })

    await page.goto('/#/inquiry/inq-001')
    await expect(
      page.locator('.status-badge[data-status="canceled"]')
    ).toBeVisible()

    await page.getByText('再オープン').click()

    await expect(
      page.locator('.status-badge[data-status="open"]')
    ).toBeVisible()
  })

  test('should show error message on reopen failure', async ({ page }) => {
    const resolvedDetail = {
      ...sampleInquiryDetail,
      status: 'Resolved',
      closedDate: '2026-01-20T15:00:00Z',
    }

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: resolvedDetail }),
      })
    )

    await page.route('**/api/km/inquiry/reopen/inq-001', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ERROR',
          message: 'Server error',
        }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    await page.getByText('再オープン').click()

    await expect(page.locator('.alert-danger')).toBeVisible()
  })
})
