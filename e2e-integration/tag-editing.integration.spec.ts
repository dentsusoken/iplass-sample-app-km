/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'

/**
 * 前提: DB に test1, test2, test3 の3つのタグが登録済みであること
 */
test.describe('Tag Editing (real server)', () => {
  test.describe.configure({ mode: 'serial' })

  let inquiryOid: string

  test('should create inquiry for tag tests', async ({ page }) => {
    await login(page)

    await page.getByText('新規問合せ').click()
    await expect(page.getByText('新規問合せ作成')).toBeVisible()

    const title = `Tag Edit Test ${Date.now()}`
    await page.locator('input[type="text"]').fill(title)
    await page.locator('textarea').fill('Inquiry for testing tag editing.')

    await page.getByText('問合せを送信').click()
    await page.waitForURL(/.*#\/inquiry\/[^/]+$/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.chat-header__title')).toContainText(title, {
      timeout: 10000,
    })

    inquiryOid = page.url().split('/inquiry/').pop()!
    expect(inquiryOid).toBeTruthy()
  })

  test('should open tag editor modal with checkboxes', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    await page.getByText('タグ編集').click()

    const modal = page.locator('.modal.d-block')
    await expect(modal).toBeVisible()
    await expect(modal.getByText('タグ編集')).toBeVisible()

    // test1, test2, test3 のチェックボックスが表示されるはず
    await expect(modal.locator('.form-check-input').first()).toBeVisible({
      timeout: 5000,
    })
    const count = await modal.locator('.form-check-input').count()
    expect(count).toBeGreaterThanOrEqual(3)

    // すべて未チェックのはず (新規問合せはタグなし)
    for (let i = 0; i < count; i++) {
      await expect(modal.locator('.form-check-input').nth(i)).not.toBeChecked()
    }

    await modal.getByText('キャンセル').click()
    await expect(modal).not.toBeVisible()
  })

  test('should add a tag and see TagBadge appear', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    await page.getByText('タグ編集').click()
    const modal = page.locator('.modal.d-block')
    await expect(modal).toBeVisible()

    // test1 をチェック
    const test1Label = modal
      .locator('.form-check-label')
      .filter({ hasText: 'test1' })
    await expect(test1Label).toBeVisible()
    const test1Checkbox = modal.locator('.form-check-input').first()
    // test1 に対応するチェックボックスを探す
    const test1Id = await test1Label.getAttribute('for')
    const checkbox = modal.locator(`#${test1Id}`)
    await checkbox.check()

    await modal.locator('button').filter({ hasText: '保存' }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // TagBadge が表示されるはず
    await expect(
      page.locator('.chat-header__meta').getByText('test1')
    ).toBeVisible({ timeout: 10000 })
  })

  test('should remove a tag and see TagBadge disappear', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // test1 のバッジが表示されていることを確認
    await expect(
      page.locator('.chat-header__meta').getByText('test1')
    ).toBeVisible()

    await page.getByText('タグ編集').click()
    const modal = page.locator('.modal.d-block')
    await expect(modal).toBeVisible()

    // すべて未チェックにする
    const checkboxes = modal.locator('.form-check-input')
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      if (await checkboxes.nth(i).isChecked()) {
        await checkboxes.nth(i).uncheck()
      }
    }

    await modal.locator('button').filter({ hasText: '保存' }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    await page.waitForLoadState('networkidle')
    await expect(page.locator('.chat-header__meta .tag-badge')).toHaveCount(0, {
      timeout: 10000,
    })
  })

  test('should select multiple tags and display all of them', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // ペイロード検証のためタグ更新リクエストを横取りする
    let tagUpdatePayload = ''
    await page.route('**/api/km/inquiry/tags/update/**', async (route) => {
      tagUpdatePayload = route.request().postData() ?? ''
      const response = await route.fetch()
      await route.fulfill({ response })
    })

    await page.getByText('タグ編集').click()
    const modal = page.locator('.modal.d-block')
    await expect(modal).toBeVisible()

    // test1 と test2 をチェック
    const labels = modal.locator('.form-check-label')
    for (const tagName of ['test1', 'test2']) {
      const label = labels.filter({ hasText: tagName })
      const forAttr = await label.getAttribute('for')
      await modal.locator(`#${forAttr}`).check()
    }

    await modal.locator('button').filter({ hasText: '保存' }).click()
    await expect(modal).not.toBeVisible()

    // ペイロードに 2 つの tagOids が含まれることを検証
    const payload = JSON.parse(tagUpdatePayload)
    expect(payload.tagOids).toHaveLength(2)

    // 両方のタグがバッジとして表示されるはず
    await page.waitForLoadState('networkidle')
    const badges = page.locator('.chat-header__meta .tag-badge')
    await expect(badges).toHaveCount(2, { timeout: 10000 })
    await expect(
      page.locator('.chat-header__meta').getByText('test1')
    ).toBeVisible()
    await expect(
      page.locator('.chat-header__meta').getByText('test2')
    ).toBeVisible()
  })
})
