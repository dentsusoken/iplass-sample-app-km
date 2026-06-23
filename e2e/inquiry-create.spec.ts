/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiryDetail } from './helpers/mock-api'

test.describe('New Inquiry Creation', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page)

    // 問合せ一覧をモックする (遷移用)
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], totalCount: 0 }),
      })
    )
  })

  test('should display creation form', async ({ page }) => {
    await page.goto('/#/inquiry/new')
    await expect(page.getByText('新規問合せ作成')).toBeVisible()
  })

  test('should have title and content fields', async ({ page }) => {
    await page.goto('/#/inquiry/new')
    await expect(page.locator('input[type="text"]')).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('should have breadcrumb back to list', async ({ page }) => {
    await page.goto('/#/inquiry/new')
    await expect(page.getByText('問合せ一覧').first()).toBeVisible()
  })

  test('should have cancel button', async ({ page }) => {
    await page.goto('/#/inquiry/new')
    await expect(page.getByText('キャンセル')).toBeVisible()
  })

  test('submit button should be disabled when fields are empty', async ({
    page,
  }) => {
    await page.goto('/#/inquiry/new')
    const submitBtn = page.getByText('問合せを送信')
    await expect(submitBtn).toBeDisabled()
  })

  test('submit button should be enabled when title and content are filled', async ({
    page,
  }) => {
    await page.goto('/#/inquiry/new')

    await page.locator('input[type="text"]').fill('Test title')
    await page.locator('textarea').fill('Test content')

    const submitBtn = page.getByText('問合せを送信')
    await expect(submitBtn).toBeEnabled()
  })

  test('should create inquiry and navigate to chat', async ({ page }) => {
    // 作成 API をモックする
    await page.route('**/api/km/inquiry/create', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { oid: 'inq-new-001' } }),
      })
    )

    // 作成した問合せの詳細をモックする
    await page.route('**/api/km/inquiry/detail/inq-new-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            ...sampleInquiryDetail,
            oid: 'inq-new-001',
            name: 'My new inquiry',
          },
        }),
      })
    )

    await page.goto('/#/inquiry/new')

    await page.locator('input[type="text"]').fill('My new inquiry')
    await page.locator('textarea').fill('Description of my issue')

    await page.getByText('問合せを送信').click()

    // 作成した問合せのチャット画面へ遷移するはず
    await expect(page).toHaveURL(/#\/inquiry\/inq-new-001/)
  })

  test('should show error message on creation failure', async ({ page }) => {
    await page.route('**/api/km/inquiry/create', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          errorCode: 'SERVER_ERROR',
          message: '問合せの作成に失敗しました',
        }),
      })
    )

    await page.goto('/#/inquiry/new')

    await page.locator('input[type="text"]').fill('Test title')
    await page.locator('textarea').fill('Test content')
    await page.getByText('問合せを送信').click()

    // エラーアラートが表示されるはず
    await expect(page.locator('[role="alert"]')).toBeVisible()
  })

  test('cancel button should navigate back to list', async ({ page }) => {
    await page.goto('/#/inquiry/new')
    await page.getByText('キャンセル').click()
    await expect(page).toHaveURL(/#\/inquiry\/list/)
  })
})
