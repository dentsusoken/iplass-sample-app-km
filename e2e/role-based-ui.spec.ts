/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiryDetail } from './helpers/mock-api'

const openInquiryDetail = {
  ...sampleInquiryDetail,
  status: 'Open',
  closedDate: null,
}

test.describe('Role-Based UI - Responder', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, {
      roles: ['inquiry_responder'],
      userName: 'Test User',
    })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: openInquiryDetail }),
      })
    )
  })

  test('should show tag edit button', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('タグ編集')).toBeVisible()
  })

  test('should show delete button on posts', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(
      page.locator('.post__actions').filter({ hasText: '削除' }).first()
    ).toBeVisible()
  })

  test('should show edit button on own posts', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    // post-001 は user-001 (現在のユーザーと同じ) が作成
    await expect(
      page.locator('.post__actions').filter({ hasText: '編集' }).first()
    ).toBeVisible()
  })

  test('should show close buttons for open inquiry', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('解決済みにする')).toBeVisible()
  })
})

test.describe('Role-Based UI - User', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, {
      roles: ['inquiry_user'],
      userName: 'Test User',
    })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: openInquiryDetail }),
      })
    )
  })

  test('should hide tag edit button', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('タグ編集')).not.toBeVisible()
  })

  test('should hide delete button on posts', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(
      page.locator('.post__actions').filter({ hasText: '削除' })
    ).toHaveCount(0)
  })

  test('should show edit button on own posts', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    // post-001 は user-001 (現在のユーザーと同じ) が作成
    await expect(
      page.locator('.post__actions').filter({ hasText: '編集' }).first()
    ).toBeVisible()
  })

  test('should show close buttons for open inquiry', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('解決済みにする')).toBeVisible()
  })
})
