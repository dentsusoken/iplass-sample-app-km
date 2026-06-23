/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiries } from './helpers/mock-api'

/**
 * 検索フィルタのモックE2Eテスト
 *
 * 仕様:
 * - ステータスフィルタ: MultiSelectDropdown 複数選択 → statuses パラメータ
 *   (同名キー複数 `?statuses=Open&statuses=Answered` 形式、サーバは
 *   iPLAss RequestContext.getParams で String[] として受ける)
 * - キーワード検索: タイトル・要約の部分一致 → keyword パラメータ
 * - タグフィルタ: MultiSelectDropdown 複数選択 → tagOids パラメータ
 *   (同上、同名キー複数展開)
 * - 複合条件: 上記の組み合わせ
 * - フィルタ変更時はページを1にリセット（offset=0）
 * - ソート: テーブルヘッダクリックで sortField / sortOrder パラメータ
 *
 * 既存テスト（date-range-filter.spec.ts）で日付フィルタは検証済み。
 * このテストではステータス・キーワード・タグフィルタ・ソートを検証する。
 */
test.describe('Search Filter', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page)
  })

  function mockListApi(
    page: import('@playwright/test').Page,
    requests: string[]
  ) {
    return page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: sampleInquiries.length,
        }),
      })
    })
  }

  /** ヘルパー: MultiSelectDropdown を開きラベルでオプションをチェックする */
  async function selectMultiOptions(
    page: import('@playwright/test').Page,
    dropdownIndex: number,
    labels: string[]
  ) {
    // ドロップダウンボタンをクリックして開く
    const dropdown = page.locator('.multi-select').nth(dropdownIndex)
    await dropdown.locator('button.multi-select__trigger').click()
    // 各ラベルをチェック
    for (const label of labels) {
      await dropdown
        .locator('.multi-select__option', { hasText: label })
        .click()
    }
    // 外側をクリックして閉じる
    await page.locator('body').click({ position: { x: 0, y: 0 } })
  }

  test('should send statuses parameter when status filter is selected', async ({
    page,
  }) => {
    const requests: string[] = []
    await mockListApi(page, requests)

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // MultiSelectDropdown で "Open" ステータスを選択
    await selectMultiOptions(page, 0, ['オープン'])
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('statuses=Open')
  })

  test('should send multiple statuses as repeated query parameters', async ({
    page,
  }) => {
    const requests: string[] = []
    await mockListApi(page, requests)

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // MultiSelectDropdown で "Open" と "Answered" を選択
    await selectMultiOptions(page, 0, ['オープン', '回答済'])
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    // iPLAss RequestContext.getParams で受けるため同名キー複数展開で送る
    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('statuses=Open')
    expect(lastUrl).toContain('statuses=Answered')
    // CSV エンコード形式ではない
    expect(lastUrl).not.toContain('statuses=Open%2CAnswered')
  })

  test('should send keyword parameter when keyword is entered', async ({
    page,
  }) => {
    const requests: string[] = []
    await mockListApi(page, requests)

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // キーワードを入力
    await page.locator('input[type="text"]').first().fill('login')
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('keyword=login')
  })

  test('should send tagOids parameter when tag filter is selected', async ({
    page,
  }) => {
    const requests: string[] = []
    await mockListApi(page, requests)

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // MultiSelectDropdown (2 番目) で "Technical" タグを選択
    await selectMultiOptions(page, 1, ['Technical'])
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('tagOids=tag-002')
  })

  test('should send combined parameters for multiple filters', async ({
    page,
  }) => {
    const requests: string[] = []
    await mockListApi(page, requests)

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // 複数のフィルタを設定
    await selectMultiOptions(page, 0, ['回答済'])
    await page.locator('input[type="text"]').first().fill('billing')
    await selectMultiOptions(page, 1, ['Billing'])
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('statuses=Answered')
    expect(lastUrl).toContain('keyword=billing')
    expect(lastUrl).toContain('tagOids=tag-003')
  })

  test('should not send filter parameters when all filters are default', async ({
    page,
  }) => {
    const requests: string[] = []
    await mockListApi(page, requests)

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // フィルタを設定せずに検索をクリック
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).not.toContain('statuses=')
    expect(lastUrl).not.toContain('keyword=')
    expect(lastUrl).not.toContain('tagOids=')
  })

  test('should display filtered results', async ({ page }) => {
    // statuses=Open のとき Open の問合せのみ返す
    await page.route('**/api/km/inquiry/list*', (route) => {
      const url = route.request().url()
      if (url.includes('statuses=Open')) {
        const openOnly = sampleInquiries.filter((i) => i.status === 'Open')
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: openOnly,
            totalCount: openOnly.length,
          }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: sampleInquiries.length,
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    // 初期状態は 3 件すべて
    await expect(page.getByText('全 3 件')).toBeVisible()

    // Open でフィルタ
    await selectMultiOptions(page, 0, ['オープン'])
    await page.getByRole('button', { name: '検索' }).click()

    // Open の問合せ 1 件だけ表示されるはず
    await expect(page.getByText('全 1 件')).toBeVisible()
    await expect(page.getByText('Login issue on production')).toBeVisible()
  })

  test('should reset to page 1 when filter changes', async ({ page }) => {
    const requests: string[] = []
    await page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: 45, // ページング表示に十分な件数
        }),
      })
    })

    await page.goto('/#/inquiry/list')
    await expect(page.locator('.app-pagination')).toBeVisible()

    // 次ページ (2 ページ目) へ移動
    await page
      .locator('.app-pagination')
      .getByRole('button', { name: '次のページ' })
      .click()
    await page.waitForTimeout(500)

    // ステータスフィルタを適用
    await selectMultiOptions(page, 0, ['オープン'])
    await page.getByRole('button', { name: '検索' }).click()
    await page.waitForTimeout(500)

    // offset=0 にリセットされるはず
    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('offset=0')
  })

  test('should display status options as checkboxes in MultiSelectDropdown', async ({
    page,
  }) => {
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: sampleInquiries.length,
        }),
      })
    )

    await page.goto('/#/inquiry/list')

    // ステータスのドロップダウンを開く
    const statusDropdown = page.locator('.multi-select').first()
    await statusDropdown.locator('button.multi-select__trigger').click()

    // チェックボックスのオプションが 4 つあるはず (Open, Answered, Resolved, Canceled)
    await expect(statusDropdown.locator('.multi-select__option')).toHaveCount(4)

    // 各ステータスが一覧に表示されることを確認
    await expect(
      statusDropdown.locator('.multi-select__option', { hasText: 'オープン' })
    ).toBeVisible()
    await expect(
      statusDropdown.locator('.multi-select__option', { hasText: '回答済' })
    ).toBeVisible()
    await expect(
      statusDropdown.locator('.multi-select__option', { hasText: '解決済' })
    ).toBeVisible()
    await expect(
      statusDropdown.locator('.multi-select__option', { hasText: 'キャンセル' })
    ).toBeVisible()
  })

  test('should display tag options as checkboxes in MultiSelectDropdown', async ({
    page,
  }) => {
    await page.route('**/api/km/inquiry/list*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: sampleInquiries.length,
        }),
      })
    )

    await page.goto('/#/inquiry/list')

    // タグのドロップダウンを開く
    const tagDropdown = page.locator('.multi-select').nth(1)
    await tagDropdown.locator('button.multi-select__trigger').click()

    // チェックボックスのオプションが 3 つあるはず (General, Technical, Billing)
    await expect(tagDropdown.locator('.multi-select__option')).toHaveCount(3)

    // 各タグが一覧に表示されることを確認
    await expect(
      tagDropdown.locator('.multi-select__option', { hasText: 'General' })
    ).toBeVisible()
    await expect(
      tagDropdown.locator('.multi-select__option', { hasText: 'Technical' })
    ).toBeVisible()
    await expect(
      tagDropdown.locator('.multi-select__option', { hasText: 'Billing' })
    ).toBeVisible()
  })
})

test.describe('Sort', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page)
  })

  function mockListApi(
    page: import('@playwright/test').Page,
    requests: string[]
  ) {
    return page.route('**/api/km/inquiry/list*', (route) => {
      requests.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sampleInquiries,
          totalCount: sampleInquiries.length,
        }),
      })
    })
  }

  test('should send sortField and sortOrder when header is clicked', async ({
    page,
  }) => {
    const requests: string[] = []
    await mockListApi(page, requests)

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // タイトルヘッダーをクリックしてソート
    await page.locator('.sortable-header', { hasText: 'タイトル' }).click()
    await page.waitForTimeout(500)

    const lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('sortField=name')
    expect(lastUrl).toContain('sortOrder=DESC')
  })

  test('should toggle sort direction on repeated header clicks', async ({
    page,
  }) => {
    const requests: string[] = []
    await mockListApi(page, requests)

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // 1 回目のクリック: DESC
    await page.locator('.sortable-header', { hasText: 'タイトル' }).click()
    await page.waitForTimeout(500)

    let lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('sortField=name')
    expect(lastUrl).toContain('sortOrder=DESC')

    // 2 回目のクリック: ASC
    await page.locator('.sortable-header', { hasText: 'タイトル' }).click()
    await page.waitForTimeout(500)

    lastUrl = requests[requests.length - 1]
    expect(lastUrl).toContain('sortField=name')
    expect(lastUrl).toContain('sortOrder=ASC')

    // 3 回目のクリック: 既定に戻る (sortField/sortOrder なし)
    await page.locator('.sortable-header', { hasText: 'タイトル' }).click()
    await page.waitForTimeout(500)

    lastUrl = requests[requests.length - 1]
    expect(lastUrl).not.toContain('sortField=')
    expect(lastUrl).not.toContain('sortOrder=')
  })

  test('should show sort indicator on active sort column', async ({ page }) => {
    const requests: string[] = []
    await mockListApi(page, requests)

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    const titleHeader = page.locator('.sortable-header', {
      hasText: 'タイトル',
    })

    // ソートインジケータは Material Symbols アイコン。span のテキストは ligature 名
    // (arrow_drop_down=降順 / arrow_drop_up=昇順) で、ソート中の列だけ --active が付く
    const indicator = titleHeader.locator('.sort-indicator')

    // 初期状態は未ソート（方向インジケータは非アクティブ）
    await expect(indicator).not.toHaveClass(/sort-indicator--active/)

    // クリック: 降順インジケータ
    await titleHeader.click()
    await page.waitForTimeout(200)
    await expect(indicator).toHaveClass(/sort-indicator--active/)
    await expect(indicator).toHaveText('arrow_drop_down')

    // 再クリック: 昇順インジケータ
    await titleHeader.click()
    await page.waitForTimeout(200)
    await expect(indicator).toHaveText('arrow_drop_up')
  })

  test('should not have sort on tag and creator columns', async ({ page }) => {
    const requests: string[] = []
    await mockListApi(page, requests)

    await page.goto('/#/inquiry/list')
    await page.waitForLoadState('networkidle')

    // タグと作成者のヘッダーはソート不可のはず
    const tagHeader = page.locator('th', { hasText: 'タグ' })
    const creatorHeader = page.locator('th', { hasText: '作成者' })

    await expect(tagHeader).not.toHaveClass(/sortable-header/)
    await expect(creatorHeader).not.toHaveClass(/sortable-header/)
  })
})
