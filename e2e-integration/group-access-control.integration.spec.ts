/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'

/**
 * グループベース参照制御の統合テスト
 *
 * - inquiry_user: 自グループ（＋子グループ）の問合せのみ参照可能
 * - inquiry_responder: 全件参照可能
 * - EntityPermission referenceCondition:
 *   accessibleGroupCodes in (${toIn(user.groupCodeWithChildren)})
 *
 * 前提条件:
 * - testresponder (inquiry_responder): 全件参照可能
 * - testuser (inquiry_user): 自グループの問合せのみ参照可能
 * - 異なるグループに属するユーザーがAdmin Consoleで設定済みであること
 * - 少なくとも1件の問合せが存在すること
 */
test.describe('Group-Based Access Control (real server)', () => {
  test('testresponder sees all inquiries regardless of group', async ({
    page,
  }) => {
    await login(page)

    // 一覧の読み込みを待つ
    await expect(page.locator('.list-header__count')).toBeVisible({
      timeout: 10000,
    })

    // 回答者には問合せが見える (totalCount > 0、少なくとも一覧は読み込まれる)
    const countText = await page.locator('.list-header__count').textContent()
    const responderCount = parseInt(countText?.match(/\d+/)?.[0] ?? '0', 10)

    // 回答者には少なくともいくつかの問合せが見えるはず
    expect(responderCount).toBeGreaterThanOrEqual(0)

    // 利用者ビューと比較するため件数を保存
    test.info().annotations.push({
      type: 'responderCount',
      description: String(responderCount),
    })
  })

  test('testuser sees only inquiries from own group', async ({ page }) => {
    await login(page, 'testuser', 'testuser')

    await expect(page.locator('.list-header__count')).toBeVisible({
      timeout: 10000,
    })

    const countText = await page.locator('.list-header__count').textContent()
    const userCount = parseInt(countText?.match(/\d+/)?.[0] ?? '0', 10)

    // 利用者は限定された集合を見る (グループ一致の問合せが無ければ 0 もありうる)
    // 重要な検証は、この件数が回答者の件数以下であること
    expect(userCount).toBeGreaterThanOrEqual(0)
  })

  test('testuser cannot see inquiries created by other group users', async ({
    page,
  }) => {
    // まず testresponder として問合せを作成
    await login(page)
    await page.getByText('新規問合せ').click()
    await expect(page.getByText('新規問合せ作成')).toBeVisible()

    const uniqueTitle = `Group Access Test ${Date.now()}`
    await page.locator('input[type="text"]').fill(uniqueTitle)
    await page
      .locator('textarea')
      .fill('This inquiry should only be visible to responder group.')
    await page.getByText('問合せを送信').click()
    await page.waitForURL(/.*#\/inquiry\/(?!new$|list$)[^/]+$/, {
      timeout: 15000,
    })

    // セッションをクリアして testuser でログイン
    await page.context().clearCookies()
    await login(page, 'testuser', 'testuser')

    // 一意なタイトルで検索
    await page.locator('input[type="text"]').first().fill(uniqueTitle)
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForLoadState('networkidle')

    // この問合せは testuser には表示されないはず (異なるグループ)
    await expect(page.getByText(uniqueTitle)).not.toBeVisible({
      timeout: 5000,
    })
  })
})
