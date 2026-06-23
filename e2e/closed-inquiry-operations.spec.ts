/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiryDetail } from './helpers/mock-api'

const closedInquiryDetail = {
  ...sampleInquiryDetail,
  status: 'Resolved',
  closedDate: '2026-01-20T15:00:00Z',
}

test.describe('Closed Inquiry Operations - Responder', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, {
      roles: ['inquiry_responder'],
      userName: 'Test User',
    })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: closedInquiryDetail }),
      })
    )
  })

  test('should hide edit button but show delete button for responder', async ({
    page,
  }) => {
    await page.goto('/#/inquiry/inq-001')

    // クローズ済み問合せでは編集ボタンが非表示になること
    await expect(
      page.locator('.post__actions').filter({ hasText: '編集' })
    ).toHaveCount(0)

    // 削除ボタンは回答者には引き続き表示されること (管理操作)
    await expect(
      page.locator('.post__actions').filter({ hasText: '削除' }).first()
    ).toBeVisible()
  })

  test('should hide PostForm on closed inquiry', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.locator('textarea')).not.toBeVisible()
  })

  test('should show reopen button on closed inquiry', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('再オープン')).toBeVisible()
  })
})

test.describe('Closed Inquiry Operations - User', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, {
      roles: ['inquiry_user'],
      userName: 'Test User',
    })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: closedInquiryDetail }),
      })
    )
  })

  test('should hide both edit and delete for user on closed inquiry', async ({
    page,
  }) => {
    await page.goto('/#/inquiry/inq-001')

    await expect(
      page.locator('.post__actions').filter({ hasText: '編集' })
    ).toHaveCount(0)
    await expect(
      page.locator('.post__actions').filter({ hasText: '削除' })
    ).toHaveCount(0)
  })
})
