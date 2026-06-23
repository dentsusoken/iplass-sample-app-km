/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'

/**
 * 検索・フィルタの統合テスト（実サーバー）
 *
 * 複数選択対応:
 *   - ステータス: MultiSelectDropdown で複数選択 → statuses パラメータ（IN 条件）
 *   - タグ: MultiSelectDropdown で複数選択 → tagOids パラメータ（AND 検索）
 * ソート機能: テーブルヘッダクリックで sortField/sortOrder
 *
 * 前提: testuser/testuser, testresponder/testresponder が登録済み
 */
test.describe('Search and Filter (real server)', () => {
  /** Helper: MultiSelectDropdown を開いてラベルを選択する */
  async function selectDropdownOption(
    page: import('@playwright/test').Page,
    dropdownIndex: number,
    label: string
  ) {
    const dropdown = page.locator('.multi-select').nth(dropdownIndex)
    await dropdown.locator('button.multi-select__trigger').click()
    await dropdown.locator('.multi-select__option', { hasText: label }).click()
    await page.locator('.list-header__title').click()
  }

  /** Helper: テーブル行から指定カラムのテキストを全行分取得する */
  async function getColumnTexts(
    page: import('@playwright/test').Page,
    cellSelector: string
  ): Promise<string[]> {
    const cells = page.locator(`tbody tr ${cellSelector}`)
    const count = await cells.count()
    const texts: string[] = []
    for (let i = 0; i < count; i++) {
      const text = await cells.nth(i).textContent()
      texts.push((text ?? '').trim())
    }
    return texts
  }

  /** Helper: 問合せを作成しOIDを返す */
  async function createInquiry(
    page: import('@playwright/test').Page,
    title: string,
    content: string
  ): Promise<string> {
    await page.getByText('新規問合せ').click()
    await expect(page.getByText('新規問合せ作成')).toBeVisible()
    await page.locator('input[type="text"]').fill(title)
    await page.locator('textarea').fill(content)
    await page.getByText('問合せを送信').click()
    await page.waitForURL(/.*#\/inquiry\/(?!new$|list$)[^/]+$/, {
      timeout: 15000,
    })
    await page.waitForLoadState('networkidle')
    return page.url().split('/inquiry/').pop()!
  }

  test('should filter by single status', async ({ page }) => {
    await login(page)

    await selectDropdownOption(page, 0, 'オープン')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForLoadState('networkidle')

    // 全てのステータスバッジが "Open" であること
    const badges = page.locator('.status-badge')
    const count = await badges.count()
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(badges.nth(i)).toHaveAttribute('data-status', 'open')
      }
    }
  })

  test.describe('Multi-status filter (IN condition)', () => {
    test.describe.configure({ mode: 'serial' })

    let answeredOid: string

    test('setup: testuser creates two inquiries (both Open)', async ({
      page,
    }) => {
      await login(page, 'testuser', 'testuser')
      await createInquiry(page, `MultiStatus A ${Date.now()}`, 'Stays Open')
      await expect(
        page.locator('.status-badge[data-status="open"]')
      ).toBeVisible()

      // 一覧に戻って2件目を作成
      await page.goto('', { waitUntil: 'networkidle' })
      answeredOid = await createInquiry(
        page,
        `MultiStatus B ${Date.now()}`,
        'Will become Answered'
      )
      await expect(
        page.locator('.status-badge[data-status="open"]')
      ).toBeVisible()
    })

    test('setup: testresponder replies to B (→ Answered)', async ({ page }) => {
      await login(page)
      await page.goto(`#/inquiry/${answeredOid}`)
      await page.waitForLoadState('networkidle')
      await page.locator('textarea').first().fill('Responder reply.')
      await page.locator('button', { hasText: '送信' }).click()
      await page.waitForLoadState('networkidle')
      await expect(
        page.locator('.status-badge[data-status="answered"]')
      ).toBeVisible({ timeout: 10000 })
    })

    test('should return both Open and Answered with IN filter', async ({
      page,
    }) => {
      await login(page)

      // Open と Answered を選択
      await selectDropdownOption(page, 0, 'オープン')
      await selectDropdownOption(page, 0, '回答済')

      await page.getByRole('button', { name: '検索' }).click()
      await page.waitForLoadState('networkidle')
      // テーブル描画完了を待機（networkidle後もVueの再レンダリングが遅延する場合がある）
      await expect(page.locator('tbody tr').first()).toBeVisible({
        timeout: 10000,
      })

      // 結果が存在し、全てが Open または Answered であること
      const badges = page.locator('.status-badge')
      const count = await badges.count()
      expect(count).toBeGreaterThanOrEqual(2)

      const statusTexts = new Set<string>()
      for (let i = 0; i < count; i++) {
        // StatusBadge は装飾アイコン(.material-symbols-outlined)を含むため、
        // ステータス名のラベル span のみを読む
        const text = (
          await badges
            .nth(i)
            .locator('span:not(.material-symbols-outlined)')
            .textContent()
        )?.trim()
        expect(['オープン', '回答済']).toContain(text)
        if (text) statusTexts.add(text)
      }
      // 両方のステータスが結果に含まれること
      expect(statusTexts.has('オープン')).toBe(true)
      expect(statusTexts.has('回答済')).toBe(true)
    })
  })

  test('should filter by keyword', async ({ page }) => {
    await login(page)

    const searchInput = page.getByPlaceholder('キーワードで検索')
    await searchInput.fill('Tag Edit Test')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForLoadState('networkidle')

    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count > 0) {
      const firstTitle = rows.first().locator('.table-title')
      await expect(firstTitle).toContainText('Tag Edit Test')
    }
  })

  test('should filter by tag and show matching results', async ({ page }) => {
    await login(page)

    const tagDropdown = page.locator('.multi-select').nth(1)
    await tagDropdown.locator('button.multi-select__trigger').click()
    const options = tagDropdown.locator('.multi-select__option')
    const optionCount = await options.count()
    if (optionCount === 0) return

    // タグ名を取得してから選択
    const selectedTagName = await options.first().locator('span').textContent()
    await options.first().click()
    await page.locator('.list-header__title').click()

    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForLoadState('networkidle')

    // 結果が存在する場合、各行に選択したタグが含まれていること
    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()
    if (rowCount > 0 && selectedTagName) {
      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const tagBadges = rows.nth(i).locator('.tag-badge')
        const tagCount = await tagBadges.count()
        const tagTexts: string[] = []
        for (let j = 0; j < tagCount; j++) {
          tagTexts.push((await tagBadges.nth(j).textContent()) ?? '')
        }
        expect(tagTexts).toContain(selectedTagName.trim())
      }
    }
  })

  test('should clear filters and show all results', async ({ page }) => {
    await login(page)

    const totalText = await page.getByText(/全 \d+ 件/).textContent()
    const totalMatch = totalText?.match(/全 (\d+) 件/)
    const totalCount = totalMatch ? parseInt(totalMatch[1]) : 0

    await selectDropdownOption(page, 0, 'オープン')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForLoadState('networkidle')

    // フィルタ解除
    await selectDropdownOption(page, 0, 'オープン')
    await page.getByPlaceholder('キーワードで検索').fill('')

    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(`全 ${totalCount} 件`)).toBeVisible()
  })

  test('should sort by title and reverse data order', async ({ page }) => {
    await login(page)
    await expect(page.locator('.list-header__count')).toBeVisible()

    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()
    if (rowCount < 2) return

    // DESC ソート
    const titleHeader = page.locator('th', { hasText: 'タイトル' }).first()
    await titleHeader.click()
    await page.waitForLoadState('networkidle')
    const titlesDesc = await getColumnTexts(page, '.table-title')

    // ASC ソート
    await titleHeader.click()
    await page.waitForLoadState('networkidle')
    const titlesAsc = await getColumnTexts(page, '.table-title')

    // DESC と ASC で順序が異なること（全タイトル同一の場合のみスキップ）
    const allSame = titlesDesc.every((t) => t === titlesDesc[0])
    if (!allSame) {
      expect(titlesDesc[0]).not.toBe(titlesAsc[0])
    }

    // ASC: 先頭 <= 末尾（昇順の基本性質）
    if (titlesAsc.length >= 2) {
      expect(
        titlesAsc[0].localeCompare(titlesAsc[titlesAsc.length - 1])
      ).toBeLessThanOrEqual(0)
    }
  })

  test('should sort by createDate and reverse data order', async ({ page }) => {
    await login(page)
    await expect(page.locator('.list-header__count')).toBeVisible()

    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()
    if (rowCount < 2) return

    // DESC ソート
    const dateHeader = page.locator('th', { hasText: '作成日時' }).first()
    await dateHeader.click()
    await page.waitForLoadState('networkidle')
    const datesDesc = await getColumnTexts(page, 'td:last-child')

    // ASC ソート
    await dateHeader.click()
    await page.waitForLoadState('networkidle')
    const datesAsc = await getColumnTexts(page, 'td:last-child')

    // DESC と ASC で順序が異なること
    const allSame = datesDesc.every((d) => d === datesDesc[0])
    if (!allSame) {
      expect(datesDesc[0]).not.toBe(datesAsc[0])
    }

    // ASC: 先頭 <= 末尾
    if (datesAsc.length >= 2) {
      expect(
        datesAsc[0].localeCompare(datesAsc[datesAsc.length - 1])
      ).toBeLessThanOrEqual(0)
    }
  })
})
