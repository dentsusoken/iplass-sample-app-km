/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'

test.describe('Smoke Test (real server)', () => {
  test('should login and load inquiry list', async ({ page }) => {
    await login(page)
    await expect(
      page.locator('.list-header__title', { hasText: '問合せ一覧' })
    ).toBeVisible()
    await expect(page.getByText('testresponder（回答者）')).toBeVisible()
  })

  test('should display header with role badge', async ({ page }) => {
    await login(page)
    await expect(page.getByText('問合せ・ナレッジ管理')).toBeVisible()
    await expect(page.getByText('回答者')).toBeVisible()
  })

  test('should show search form on list page', async ({ page }) => {
    await login(page)
    await expect(page.getByPlaceholder('キーワードで検索')).toBeVisible()
    await expect(page.getByRole('button', { name: '検索' })).toBeVisible()
  })

  test('should navigate to new inquiry page', async ({ page }) => {
    await login(page)
    await page.getByText('新規問合せ').click()
    await expect(page).toHaveURL(/.*#\/inquiry\/new/)
    await expect(page.getByText('新規問合せ作成')).toBeVisible()
  })

  test('no console errors after login', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text())
      }
    })

    await login(page)
    expect(errors).toEqual([])
  })
})
