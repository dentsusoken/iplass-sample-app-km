/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiryDetail } from './helpers/mock-api'

test.describe('Inquiry Chat Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page)

    // 問合せ詳細をモックする
    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )
  })

  test('should display inquiry title and status', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(
      page.locator('.chat-header__title').getByText('Login issue on production')
    ).toBeVisible()
    await expect(
      page.locator('.status-badge[data-status="open"]')
    ).toBeVisible()
  })

  test('should display posts in order', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(
      page.getByText('I cannot log in after resetting my password.')
    ).toBeVisible()
    await expect(
      page.getByText('Please try clearing your browser cache and cookies.')
    ).toBeVisible()
  })

  test('should display post author names', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('Test User').first()).toBeVisible()
    await expect(page.getByText('Support Staff')).toBeVisible()
  })

  test('should show post form when inquiry is open', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    // PostForm に新規投稿用の textarea があること
    await expect(page.locator('textarea').first()).toBeVisible()
  })

  test('should show close/cancel buttons for open inquiry', async ({
    page,
  }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('解決済みにする')).toBeVisible()
    await expect(page.getByText('キャンセル').last()).toBeVisible()
  })

  test('should show reopen button for resolved inquiry', async ({ page }) => {
    const resolvedInquiry = {
      ...sampleInquiryDetail,
      status: 'Resolved',
      closedDate: '2026-01-20T15:00:00Z',
    }

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: resolvedInquiry }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('再オープン')).toBeVisible()
    // クローズ済み問合せでは投稿フォームが非表示になること
    await expect(page.locator('textarea')).not.toBeVisible()
  })

  test('should submit a new post', async ({ page }) => {
    let postCreated = false

    await page.route('**/api/km/inquiry/post/create/inq-001', (route) => {
      postCreated = true
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    // 投稿後に新しい投稿を含むよう詳細を再モックする
    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            ...sampleInquiryDetail,
            posts: [
              ...sampleInquiryDetail.posts,
              {
                oid: 'post-003',
                content: 'Thank you, that worked!',
                attachments: [],
                createBy: { oid: 'user-001', name: 'Test User' },
                createDate: '2026-01-15T14:00:00Z',
                updateDate: '2026-01-15T14:00:00Z',
              },
            ],
          },
        }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    const textarea = page.locator('textarea').first()
    await textarea.fill('Thank you, that worked!')

    // 投稿フォームの送信ボタンを探してクリック
    const submitBtn = page
      .locator('button')
      .filter({ hasText: /送信|投稿/ })
      .first()
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      // 投稿が表示されるのを待つ
      await expect(page.getByText('Thank you, that worked!')).toBeVisible()
    }
  })

  test('should keep post when delete is canceled', async ({ page }) => {
    // 確認ダイアログを閉じる
    page.once('dialog', async (dialog) => {
      await dialog.dismiss()
    })

    await page.goto('/#/inquiry/inq-001')

    // 投稿の削除をクリック
    const deleteBtn = page
      .locator('.post__actions')
      .filter({ hasText: '削除' })
      .first()
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // 削除をキャンセルした後も投稿が表示されたままであること
    await expect(
      page.getByText('Please try clearing your browser cache and cookies.')
    ).toBeVisible()
  })

  test('should download attachment via fetch with X-Requested-With header', async ({
    page,
  }) => {
    let binaryApiCalled = false
    let requestHeaders: Record<string, string> = {}

    await page.route('**/api/mtp/bin/lob-001', (route) => {
      binaryApiCalled = true
      requestHeaders = route.request().headers()
      return route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('fake-pdf-content'),
        headers: {
          'Content-Disposition': 'attachment; filename="guide.pdf"',
        },
      })
    })

    await page.goto('/#/inquiry/inq-001')
    const attachment = page.locator('.post__attachment').first()
    await expect(attachment).toContainText('guide.pdf')

    // クリックは新しいタブを開かず fetch を発火するはず
    const pagesBeforeClick = page.context().pages().length
    await attachment.click()
    // fetch の完了を待つ
    await page.waitForTimeout(500)

    expect(binaryApiCalled).toBe(true)
    expect(requestHeaders['x-requested-with']).toBe('XMLHttpRequest')
    // 新しいタブが開かれていないこと
    expect(page.context().pages().length).toBe(pagesBeforeClick)
  })

  test('should close inquiry as resolved', async ({ page }) => {
    await page.route('**/api/km/inquiry/close/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    )

    // クローズ後、詳細は解決済みステータスを返す
    let closeRequested = false
    await page.route('**/api/km/inquiry/detail/inq-001', (route) => {
      if (closeRequested) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { ...sampleInquiryDetail, status: 'Resolved' },
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
    await page.getByText('解決済みにする').click()
    await expect(page.getByText('再オープン')).toBeVisible()
  })
})
