/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers/login'

/**
 * ナレッジ管理一覧（`/knowledge/manage`）のブラウズ機能を実サーバーで検証する。
 * 一覧表示・公開範囲フィルタ・タイトルからの詳細遷移を対象とする。
 *
 * 前提: testresponder / testresponder でログインできること（一覧は回答者ロール専用）。
 *
 * キーワード（`q`）は全文検索で評価されるため、作成直後のナレッジは検索インデックスへ
 * 反映されるまで一致しない。そのため即時に反映される公開範囲フィルタ（DB クエリ）で
 * フィルタの振る舞いを検証する。
 */
test.describe('Knowledge Manage browse (real server)', () => {
  test.describe.configure({ mode: 'serial' })

  const marker = `MANAGE_${Date.now()}`
  const publicTitle = `${marker} Public Article`
  const internalTitle = `${marker} Internal Article`
  let publicOid: string

  /** 作成フォームからナレッジを 1 件作成し、その OID を返す。 */
  async function createKnowledge(
    page: Page,
    title: string,
    visibility: 'public' | 'internal'
  ): Promise<string> {
    await page.goto('#/knowledge/new')
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('ナレッジのタイトルを入力').fill(title)
    await page.locator('textarea').fill(`Body for ${title}`)
    await page.locator(`input[value="${visibility}"]`).check()

    const created = page.waitForResponse(
      (res) =>
        res.url().includes('/knowledge/create') &&
        res.request().method() === 'POST'
    )
    await page.getByRole('button', { name: '保存' }).click()

    const body = await (await created).json()
    // iPLAss は { status, result: { data: { oid } } } で包む
    const data = body.result?.data ?? body.data
    const oid = data.oid as string

    // 詳細画面への遷移を待ち、作成のコミット完了を保証する
    await page.waitForURL(new RegExp(`.*#/knowledge/${oid}$`), {
      timeout: 15000,
    })
    await page.waitForLoadState('networkidle')
    return oid
  }

  test('setup: 回答者が公開/内部のナレッジを作成する', async ({ page }) => {
    await login(page)
    publicOid = await createKnowledge(page, publicTitle, 'public')
    const internalOid = await createKnowledge(page, internalTitle, 'internal')
    expect(publicOid).toBeTruthy()
    expect(internalOid).toBeTruthy()
  })

  test('ナビ「ナレッジ管理」から一覧へ遷移できる', async ({ page }) => {
    await login(page)
    await page.getByRole('link', { name: 'ナレッジ管理', exact: true }).click()
    await expect(page).toHaveURL(/.*#\/knowledge\/manage/)
    await expect(
      page.getByRole('heading', { name: 'ナレッジ管理' })
    ).toBeVisible()
  })

  test('一覧は作成したナレッジを表示し、タイトル/公開範囲/更新日時の列を持つ', async ({
    page,
  }) => {
    await login(page)
    await page.goto('#/knowledge/manage')
    await page.waitForLoadState('networkidle')

    // 列ヘッダ
    await expect(page.locator('th', { hasText: 'タイトル' })).toBeVisible()
    await expect(page.locator('th', { hasText: '公開範囲' })).toBeVisible()
    await expect(page.locator('th', { hasText: '更新日時' })).toBeVisible()

    // 更新日時 DESC ソートにより作成した 2 件が先頭に来る
    const tbody = page.locator('.app-table tbody')
    await expect(tbody.getByText(publicTitle)).toBeVisible({ timeout: 10000 })
    await expect(tbody.getByText(internalTitle)).toBeVisible()

    await expect(
      tbody.locator('.visibility-badge--public').first()
    ).toBeVisible()
    await expect(
      tbody.locator('.visibility-badge--internal').first()
    ).toBeVisible()
  })

  test('公開範囲フィルタで公開/内部を絞り込める', async ({ page }) => {
    await login(page)
    await page.goto('#/knowledge/manage')
    await page.waitForLoadState('networkidle')

    const tbody = page.locator('.app-table tbody')
    const visibilitySelect = page.locator('select.search-bar__visibility')

    // 内部のみ → 内部の記事だけが残り、公開の記事は出ない
    await visibilitySelect.selectOption('internal')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForLoadState('networkidle')
    await expect(tbody.getByText(internalTitle)).toBeVisible({ timeout: 10000 })
    await expect(tbody.getByText(publicTitle)).toHaveCount(0)

    // 公開のみ → 逆になる
    await visibilitySelect.selectOption('public')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForLoadState('networkidle')
    await expect(tbody.getByText(publicTitle)).toBeVisible({ timeout: 10000 })
    await expect(tbody.getByText(internalTitle)).toHaveCount(0)
  })

  test('一覧のタイトルリンクから詳細へ遷移できる', async ({ page }) => {
    await login(page)
    await page.goto('#/knowledge/manage')
    await page.waitForLoadState('networkidle')

    // 公開でフィルタして対象を先頭に固定してからリンクを踏む
    await page.locator('select.search-bar__visibility').selectOption('public')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForLoadState('networkidle')

    const tbody = page.locator('.app-table tbody')
    await tbody.getByRole('link', { name: publicTitle }).first().click()

    await page.waitForURL(new RegExp(`.*#/knowledge/${publicOid}$`), {
      timeout: 15000,
    })
    await expect(page.getByRole('heading', { name: publicTitle })).toBeVisible({
      timeout: 10000,
    })
  })
})
