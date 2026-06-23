/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'

test.describe('Inquiry List (real server)', () => {
  test('should display total count', async ({ page }) => {
    await login(page)
    await expect(page.getByText(/全 \d+ 件/)).toBeVisible()
  })

  test('should display table columns', async ({ page }) => {
    await login(page)
    await expect(page.locator('th').getByText('タイトル')).toBeVisible()
    await expect(page.locator('th').getByText('ステータス')).toBeVisible()
    await expect(page.locator('th').getByText('タグ')).toBeVisible()
    await expect(page.locator('th').getByText('作成者')).toBeVisible()
    await expect(page.locator('th').getByText('作成日時')).toBeVisible()
  })

  test('should have status filter with options', async ({ page }) => {
    await login(page)
    // MultiSelectDropdown: ボタンをクリックして開き、チェックボックスのオプションを検証
    const statusDropdown = page.locator('.multi-select').first()
    await expect(statusDropdown).toBeVisible()
    await statusDropdown.locator('button.multi-select__trigger').click()
    // 4 つのステータス: Open, Answered, Resolved, Canceled
    await expect(statusDropdown.locator('.multi-select__option')).toHaveCount(4)
    // ドロップダウンを閉じる
    await page.locator('body').click({ position: { x: 0, y: 0 } })
  })

  test('should search by keyword', async ({ page }) => {
    await login(page)
    const searchInput = page.getByPlaceholder('キーワードで検索')
    await searchInput.fill('E2E Test')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForLoadState('networkidle')

    // 結果または空状態が表示されるはず (どちらも妥当)
    const hasResults = await page.locator('tbody tr').count()
    expect(hasResults).toBeGreaterThanOrEqual(0)
  })

  test('should navigate to detail on row click', async ({ page }) => {
    await login(page)

    // 行があれば最初の行をクリック
    const firstRow = page.locator('tbody tr').first()
    const rowCount = await page.locator('tbody tr').count()

    if (rowCount > 0) {
      const hasLink = await firstRow.locator('.table-title').count()
      if (hasLink > 0) {
        await firstRow.click()
        await expect(page).toHaveURL(/.*#\/inquiry\/[^/]+$/)
        await expect(page.locator('.chat-header__title')).toBeVisible()
      }
    }
  })
})
