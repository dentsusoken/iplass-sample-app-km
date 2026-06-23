/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect, type Page } from '@playwright/test'
import {
  setupCommonMocks,
  sampleInquiries,
  sampleKnowledge,
} from './helpers/mock-api'

const sampleKnowledgeDetail = {
  ...sampleKnowledge[0],
  relatedInquiries: [
    { oid: 'inq-001', name: 'Login issue', summaryShort: 'Cannot log in' },
  ],
  createBy: { oid: 'user-001', name: 'Test User' },
  createDate: '2026-01-15T10:00:00Z',
  updateDate: '2026-01-15T10:00:00Z',
}

async function mockInquiryList(page: Page) {
  // サーバー検索を模倣: keyword 指定時は name 部分一致で絞り込む（InquiryPicker は
  // クライアント側ではなくサーバーへ keyword を投げて候補を取得する）
  await page.route('**/api/km/inquiry/list*', (route) => {
    const keyword = new URL(route.request().url()).searchParams.get('keyword')
    const data = keyword
      ? sampleInquiries.filter((i) =>
          i.name.toLowerCase().includes(keyword.toLowerCase())
        )
      : sampleInquiries
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data, totalCount: data.length }),
    })
  })
}

test.describe('Knowledge Create (New Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, { roles: ['inquiry_responder'] })
    await mockInquiryList(page)
  })

  test('should display empty form with title "ナレッジ作成"', async ({
    page,
  }) => {
    await page.goto('/#/knowledge/new')
    await expect(
      page.getByRole('heading', { name: 'ナレッジ作成' })
    ).toBeVisible()
    await expect(page.getByPlaceholder('ナレッジのタイトルを入力')).toHaveValue(
      ''
    )
    await expect(page.locator('textarea')).toHaveValue('')
  })

  test('submit button should be disabled when name and content are empty', async ({
    page,
  }) => {
    await page.goto('/#/knowledge/new')
    const submitBtn = page.getByRole('button', { name: '保存' })
    await expect(submitBtn).toBeDisabled()
  })

  test('submit button should be enabled when name and content are filled', async ({
    page,
  }) => {
    await page.goto('/#/knowledge/new')
    await page
      .getByPlaceholder('ナレッジのタイトルを入力')
      .fill('New Knowledge')
    await page.locator('textarea').fill('Knowledge content here')
    const submitBtn = page.getByRole('button', { name: '保存' })
    await expect(submitBtn).toBeEnabled()
  })

  test('should create knowledge and navigate to detail', async ({ page }) => {
    await page.route('**/api/km/knowledge/create', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { oid: 'kb-new-001' } }),
      })
    )

    await page.route('**/api/km/knowledge/detail/kb-new-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            ...sampleKnowledgeDetail,
            oid: 'kb-new-001',
            name: 'New Knowledge',
          },
        }),
      })
    )

    await page.goto('/#/knowledge/new')
    await page
      .getByPlaceholder('ナレッジのタイトルを入力')
      .fill('New Knowledge')
    await page.locator('textarea').fill('Knowledge content here')
    await page.getByRole('button', { name: '保存' }).click()

    await expect(page).toHaveURL(/#\/knowledge\/kb-new-001/)
  })
})

test.describe('Knowledge Edit (Edit Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, { roles: ['inquiry_responder'] })
    await mockInquiryList(page)

    await page.route('**/api/km/knowledge/detail/kb-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleKnowledgeDetail }),
      })
    )
  })

  test('should preset form with existing data', async ({ page }) => {
    await page.goto('/#/knowledge/edit/kb-001')
    await expect(
      page.getByRole('heading', { name: 'ナレッジ編集' })
    ).toBeVisible()
    await expect(page.getByPlaceholder('ナレッジのタイトルを入力')).toHaveValue(
      sampleKnowledgeDetail.name
    )
    await expect(page.locator('textarea')).toHaveValue(
      sampleKnowledgeDetail.content
    )
    // プリセットの関連問合せは OID ではなく名前を箇条書きで表示するはず
    const presetItem = page.locator('.related-inquiry-item')
    await expect(presetItem).toHaveCount(1)
    await expect(presetItem).toContainText('Login issue')
  })

  test('should update knowledge and navigate to detail', async ({ page }) => {
    await page.route('**/api/km/knowledge/update/kb-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SUCCESS' }),
      })
    )

    await page.goto('/#/knowledge/edit/kb-001')

    await page
      .getByPlaceholder('ナレッジのタイトルを入力')
      .fill('Updated Title')
    await page.locator('textarea').fill('Updated content')
    await page.getByRole('button', { name: '保存' }).click()

    await expect(page).toHaveURL(/#\/knowledge\/kb-001/)
  })
})

test.describe('Knowledge Edit - Cancel and Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, { roles: ['inquiry_responder'] })
    await mockInquiryList(page)
  })

  test('cancel should navigate back', async ({ page }) => {
    await page.goto('/#/knowledge/new')
    await page.getByText('キャンセル').click()
    // 編集画面から離れて遷移するはず
    await expect(page).not.toHaveURL(/#\/knowledge\/new/)
  })

  test('should toggle visibility radio between internal and public', async ({
    page,
  }) => {
    await page.goto('/#/knowledge/new')

    // 既定は internal のはず
    const internalRadio = page.locator('input[value="internal"]')
    const publicRadio = page.locator('input[value="public"]')
    await expect(internalRadio).toBeChecked()
    await expect(publicRadio).not.toBeChecked()

    // public に切り替える
    await publicRadio.check()
    await expect(publicRadio).toBeChecked()
    await expect(internalRadio).not.toBeChecked()
  })
})

test.describe('Knowledge Edit - Related inquiry picker', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, { roles: ['inquiry_responder'] })
    await mockInquiryList(page)
  })

  test('opens a dropdown with available inquiries when the add button is clicked', async ({
    page,
  }) => {
    await page.goto('/#/knowledge/new')

    // ドロップダウンは既定で非表示
    await expect(
      page.locator('.related-inquiry-picker__dropdown')
    ).not.toBeVisible()

    await page.getByRole('button', { name: '問合せを追加' }).click()

    const dropdown = page.locator('.related-inquiry-picker__dropdown')
    await expect(dropdown).toBeVisible()
    // サンプルの問合せ 3 件すべてがオプションに表示されるはず
    const options = dropdown.locator('.related-inquiry-picker__option')
    await expect(options).toHaveCount(sampleInquiries.length)
    await expect(options.nth(0)).toContainText('Login issue on production')
  })

  test('filters options by search query', async ({ page }) => {
    await page.goto('/#/knowledge/new')
    await page.getByRole('button', { name: '問合せを追加' }).click()

    await page.getByPlaceholder('問合せ名で検索...').fill('billing')

    const options = page.locator('.related-inquiry-picker__option')
    await expect(options).toHaveCount(1)
    await expect(options.first()).toContainText('Billing question')
  })

  test('adding an inquiry moves it to the selected list with its name', async ({
    page,
  }) => {
    await page.goto('/#/knowledge/new')

    // 初期状態は選択項目なし
    await expect(page.locator('.related-inquiry-item')).toHaveCount(0)

    await page.getByRole('button', { name: '問合せを追加' }).click()
    await page
      .locator('.related-inquiry-picker__option')
      .filter({ hasText: 'Login issue on production' })
      .click()

    const selectedItems = page.locator('.related-inquiry-item')
    await expect(selectedItems).toHaveCount(1)
    await expect(selectedItems.first()).toContainText(
      'Login issue on production'
    )
    // 選択後に picker が閉じるはず
    await expect(
      page.locator('.related-inquiry-picker__dropdown')
    ).not.toBeVisible()
  })

  test('already selected inquiries are excluded from the picker options', async ({
    page,
  }) => {
    await page.goto('/#/knowledge/new')

    await page.getByRole('button', { name: '問合せを追加' }).click()
    await page
      .locator('.related-inquiry-picker__option')
      .filter({ hasText: 'Login issue on production' })
      .click()

    await page.getByRole('button', { name: '問合せを追加' }).click()
    const options = page.locator('.related-inquiry-picker__option')
    await expect(options).toHaveCount(sampleInquiries.length - 1)
    await expect(
      options.filter({ hasText: 'Login issue on production' })
    ).toHaveCount(0)
  })

  test('removing a selected inquiry returns it to the picker', async ({
    page,
  }) => {
    await page.goto('/#/knowledge/new')

    await page.getByRole('button', { name: '問合せを追加' }).click()
    await page
      .locator('.related-inquiry-picker__option')
      .filter({ hasText: 'Billing question' })
      .click()

    await expect(page.locator('.related-inquiry-item')).toHaveCount(1)

    // 選択項目の × 削除ボタンをクリック
    await page
      .locator('.related-inquiry-item')
      .first()
      .getByRole('button', { name: '削除' })
      .click()

    await expect(page.locator('.related-inquiry-item')).toHaveCount(0)

    // picker を再度開くとすべての問合せが再表示されるはず
    await page.getByRole('button', { name: '問合せを追加' }).click()
    await expect(page.locator('.related-inquiry-picker__option')).toHaveCount(
      sampleInquiries.length
    )
  })
})
