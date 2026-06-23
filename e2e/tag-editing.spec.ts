/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiryDetail } from './helpers/mock-api'

/**
 * タグ編集モーダルのモックE2Eテスト
 *
 * 仕様:
 * - 回答者（inquiry_responder）のみタグ編集ボタンを表示
 * - タグ編集ボタンクリック → モーダルダイアログ表示
 * - モーダル内にチェックボックスで利用可能タグ一覧を表示
 * - 現在の問合せタグが初期選択状態
 * - 保存 → PUT /inquiry/tags/update/{oid} → モーダル閉じ → タグ更新反映
 * - キャンセル → モーダル閉じ → 変更なし
 */
test.describe('Tag Editing Modal - Responder', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, { roles: ['inquiry_responder'] })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )

    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    )
  })

  test('should open tag editing modal on button click', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await page.getByText('タグ編集').click()

    // モーダルが表示されるはず
    const modal = page.locator('.modal')
    await expect(modal).toBeVisible()
    await expect(modal.getByText('タグ編集').first()).toBeVisible()
  })

  test('should display available tags as checkboxes', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await page.getByText('タグ編集').click()

    const modal = page.locator('.modal')
    await expect(modal.locator('.form-check')).toHaveCount(3)
    await expect(modal.getByText('General')).toBeVisible()
    await expect(modal.getByText('Technical')).toBeVisible()
    await expect(modal.getByText('Billing')).toBeVisible()
  })

  test('should pre-select current inquiry tags', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await page.getByText('タグ編集').click()

    const modal = page.locator('.modal')

    // sampleInquiryDetail は tag-002 (Technical) を持つ
    const technicalCheckbox = modal.locator('#tag-tag-002')
    await expect(technicalCheckbox).toBeChecked()

    // 他のタグはチェックされていないはず
    const generalCheckbox = modal.locator('#tag-tag-001')
    await expect(generalCheckbox).not.toBeChecked()
  })

  test('should save selected tags and close modal', async ({ page }) => {
    let tagUpdatePayload: any = null

    await page.route('**/api/km/inquiry/tags/update/inq-001', (route) => {
      tagUpdatePayload = route.request().postDataJSON()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SUCCESS' }),
      })
    })

    // 更新後のタグで再取得をモックする
    const updatedDetail = {
      ...sampleInquiryDetail,
      tags: [
        { oid: 'tag-002', tagName: 'Technical' },
        { oid: 'tag-003', tagName: 'Billing' },
      ],
    }

    await page.goto('/#/inquiry/inq-001')
    await page.getByText('タグ編集').click()

    const modal = page.locator('.modal')

    // タグを追加で選択する (Billing)
    await modal.locator('#tag-tag-003').check()

    // 再取得用に詳細レスポンスを更新する
    await page.unroute('**/api/km/inquiry/detail/inq-001')
    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: updatedDetail }),
      })
    )

    // 保存をクリック
    await modal.getByText('保存').click()

    // モーダルが閉じるはず
    await expect(modal).not.toBeVisible()

    // 更新後のタグがヘッダーに表示されるはず
    await expect(
      page.locator('.tag-badge').getByText('Technical')
    ).toBeVisible()
    await expect(page.locator('.tag-badge').getByText('Billing')).toBeVisible()

    // 正しいペイロードで API が呼ばれたことを検証
    expect(tagUpdatePayload).toEqual({
      tagOids: ['tag-002', 'tag-003'],
    })
  })

  test('should close modal on cancel without changes', async ({ page }) => {
    let tagUpdateCalled = false

    await page.route('**/api/km/inquiry/tags/update/**', (route) => {
      tagUpdateCalled = true
      return route.fulfill({ status: 200 })
    })

    await page.goto('/#/inquiry/inq-001')
    await page.getByText('タグ編集').click()

    const modal = page.locator('.modal')

    // タグを追加で選択する
    await modal.locator('#tag-tag-001').check()

    // キャンセルをクリック
    await modal.getByText('キャンセル').click()

    // モーダルが閉じるはず
    await expect(modal).not.toBeVisible()

    // API が呼ばれていないはず
    expect(tagUpdateCalled).toBe(false)
  })

  test('should show error message on tag update failure', async ({ page }) => {
    await page.route('**/api/km/inquiry/tags/update/inq-001', (route) =>
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
    await page.getByText('タグ編集').click()

    const modal = page.locator('.modal')
    await modal.getByText('保存').click()

    // エラーメッセージが表示されるはず
    await expect(page.locator('.alert-danger')).toBeVisible()
  })
})

test.describe('Tag Editing Modal - User', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, { roles: ['inquiry_user'] })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )

    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    )
  })

  test('should not show tag edit button for regular user', async ({ page }) => {
    await page.goto('/#/inquiry/inq-001')
    await expect(page.getByText('タグ編集')).not.toBeVisible()
  })
})
