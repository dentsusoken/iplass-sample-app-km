/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { readFileSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers/login'

/**
 * closedDate の設定・クリアの統合テスト
 *
 * 仕様:
 * - Resolved / Canceled 時: closedDate に現在日時を自動設定
 * - 再オープン時: closedDate を null にリセット
 *
 * 検証方針:
 *   UI からステータス遷移操作を行い、その結果サーバに永続化された closedDate を
 *   詳細取得 API を明示呼び出しで検証する。
 *   フロントエンドが詳細 API を再 fetch する実装詳細には依存させない
 *   （レスポンス傍受方式は応答パース順の race を招きフレークの原因となる）。
 */
const e2eConfig = JSON.parse(
  readFileSync('e2e-integration/e2e.config.json', 'utf-8')
)
const tcPath = `/${e2eConfig.contextPath}/${e2eConfig.tenantName}`

/**
 * 詳細取得 API から closedDate を取得する。
 *
 * iPLAss の JSON シリアライザは null 値のフィールドを省略するため、
 * closedDate フィールドの不在は null と等価に扱う（アプリ仕様）。
 */
async function fetchClosedDate(
  page: Page,
  oid: string
): Promise<string | null> {
  const res = await page.request.get(`${tcPath}/api/km/inquiry/detail/${oid}`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
  expect(
    res.ok(),
    `detail API returned ${res.status()}: ${await res.text()}`
  ).toBe(true)
  const json = await res.json()
  const data = json.result?.data ?? json.data
  return data?.closedDate ?? null
}

test.describe('closedDate behavior (real server)', () => {
  test.describe.configure({ mode: 'serial' })

  let inquiryOid: string

  test('新規作成直後は closedDate が null である', async ({ page }) => {
    await login(page)

    await page.getByText('新規問合せ').click()
    await expect(page.getByText('新規問合せ作成')).toBeVisible()

    const title = `E2E closedDate Test ${Date.now()}`
    await page.locator('input[type="text"]').fill(title)
    await page.locator('textarea').fill('Testing closedDate behavior.')

    await page.getByText('問合せを送信').click()
    await page.waitForURL(/.*#\/inquiry\/(?!new$|list$)[^/]+$/, {
      timeout: 15000,
    })

    inquiryOid = page.url().split('/inquiry/').pop()!
    expect(inquiryOid).toBeTruthy()

    expect(await fetchClosedDate(page, inquiryOid)).toBeNull()
  })

  test('Resolved にクローズすると closedDate が設定される', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)

    await page.getByText('解決済みにする').click()
    // クローズ完了は UI 上のボタン切り替わりで確認
    await expect(page.getByText('再オープン')).toBeVisible({ timeout: 10000 })

    expect(await fetchClosedDate(page, inquiryOid)).toBeTruthy()
  })

  test('再オープンすると closedDate が null にリセットされる', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)

    await page.getByText('再オープン').click()
    await expect(page.getByText('解決済みにする')).toBeVisible({
      timeout: 10000,
    })

    expect(await fetchClosedDate(page, inquiryOid)).toBeNull()
  })

  test('Canceled にクローズすると closedDate が再度設定される', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)

    const cancelBtn = page
      .locator('.chat-header__right button')
      .filter({ hasText: 'キャンセル' })
    await cancelBtn.click()
    await expect(page.getByText('再オープン')).toBeVisible({ timeout: 10000 })

    expect(await fetchClosedDate(page, inquiryOid)).toBeTruthy()
  })
})
