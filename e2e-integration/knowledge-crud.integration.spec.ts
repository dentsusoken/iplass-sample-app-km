/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'

/**
 * ナレッジCRUD統合テスト（実サーバー）
 *
 * 前提:
 * - testresponder ユーザー（inquiry_responder ロール）でログイン可能
 * - ナレッジ作成・編集・詳細表示のWebAPIが動作していること
 */
test.describe('Knowledge CRUD (real server)', () => {
  test.describe.configure({ mode: 'serial' })

  let knowledgeOid: string
  const uniqueTitle = `E2E Knowledge ${Date.now()}`
  const content = 'This is an automated E2E test knowledge article.'

  test('should navigate to knowledge creation page', async ({ page }) => {
    await login(page)

    // ナビバーの「ナレッジ作成」リンクをクリック
    await page.getByText('ナレッジ作成').click()
    await expect(page).toHaveURL(/.*#\/knowledge\/new/)
    await expect(
      page.getByRole('heading', { name: 'ナレッジ作成' })
    ).toBeVisible()
  })

  test('should create a new knowledge article', async ({ page }) => {
    await login(page)
    await page.goto('#/knowledge/new')
    await page.waitForLoadState('networkidle')

    // フォームに入力
    await page.getByPlaceholder('ナレッジのタイトルを入力').fill(uniqueTitle)
    await page.locator('textarea').fill(content)

    // 公開範囲を public に設定
    await page.locator('input[value="public"]').check()

    // OID 取り出しのため作成 API のレスポンスを捕捉
    const createResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/knowledge/create') &&
        res.request().method() === 'POST'
    )

    // 送信
    const submitBtn = page.getByRole('button', { name: '保存' })
    await expect(submitBtn).toBeEnabled()
    await submitBtn.click()

    // API レスポンスを待って OID を取り出す
    const createResponse = await createResponsePromise
    const responseBody = await createResponse.json()
    // iPLAss は { status, result: { data: { oid } } } で包む
    const resultData = responseBody.result?.data ?? responseBody.data
    knowledgeOid = resultData.oid
    expect(knowledgeOid).toBeTruthy()

    // 詳細画面へ遷移するはず
    await page.waitForURL(new RegExp(`.*#/knowledge/${knowledgeOid}$`), {
      timeout: 15000,
    })
    await page.waitForLoadState('networkidle')

    // 詳細画面に作成したタイトルが表示されるはず
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 })
  })

  test('should display knowledge detail', async ({ page }) => {
    await login(page)
    await page.goto(`#/knowledge/${knowledgeOid}`)
    await page.waitForLoadState('networkidle')

    // タイトル
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 })

    // 本文
    await expect(page.getByText(content)).toBeVisible()

    // 公開範囲バッジ (回答者には表示される)。公開範囲は日本語表記。
    // 公開範囲セクションも追加されたため、バッジ要素に限定する。
    await expect(page.locator('.visibility-badge').first()).toHaveText('公開')

    // 回答者向けの編集ボタン
    await expect(page.getByText('編集')).toBeVisible()
  })

  test('should navigate to edit page from detail', async ({ page }) => {
    await login(page)
    await page.goto(`#/knowledge/${knowledgeOid}`)
    await page.waitForLoadState('networkidle')

    await page.getByText('編集').click()
    await expect(page).toHaveURL(
      new RegExp(`.*#/knowledge/edit/${knowledgeOid}`)
    )
    await expect(
      page.getByRole('heading', { name: 'ナレッジ編集' })
    ).toBeVisible()

    // フォームに既存の値がプリセットされるはず
    await expect(page.getByPlaceholder('ナレッジのタイトルを入力')).toHaveValue(
      uniqueTitle,
      { timeout: 10000 }
    )
    await expect(page.locator('textarea')).toHaveValue(content)
  })

  test('should update the knowledge article', async ({ page }) => {
    await login(page)
    await page.goto(`#/knowledge/edit/${knowledgeOid}`)
    await page.waitForLoadState('networkidle')

    // フォームのプリセットを待つ
    await expect(page.getByPlaceholder('ナレッジのタイトルを入力')).toHaveValue(
      uniqueTitle,
      { timeout: 10000 }
    )

    // タイトルと本文を更新
    const updatedTitle = `${uniqueTitle} (Updated)`
    const updatedContent = 'Updated content from E2E integration test.'
    await page.getByPlaceholder('ナレッジのタイトルを入力').fill(updatedTitle)
    await page.locator('textarea').fill(updatedContent)

    // 公開範囲を internal に変更
    await page.locator('input[value="internal"]').check()

    // 送信
    await page.getByRole('button', { name: '保存' }).click()

    // 詳細画面へ戻るはず
    await page.waitForURL(new RegExp(`.*#/knowledge/${knowledgeOid}$`), {
      timeout: 15000,
    })
    await page.waitForLoadState('networkidle')

    // 詳細に更新後の値が表示されるはず
    await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(updatedContent)).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await login(page)
    await page.goto('#/knowledge/new')
    await page.waitForLoadState('networkidle')

    // フィールドが空のとき送信ボタンは無効のはず
    const submitBtn = page.getByRole('button', { name: '保存' })
    await expect(submitBtn).toBeDisabled()

    // タイトルだけ入力 — まだ無効
    await page.getByPlaceholder('ナレッジのタイトルを入力').fill('Title only')
    await expect(submitBtn).toBeDisabled()

    // 本文も入力 — これで有効
    await page.locator('textarea').fill('Some content')
    await expect(submitBtn).toBeEnabled()

    // タイトルをクリア — 再び無効
    await page.getByPlaceholder('ナレッジのタイトルを入力').fill('')
    await expect(submitBtn).toBeDisabled()
  })

  test('should cancel and navigate back', async ({ page }) => {
    await login(page)
    await page.goto('#/knowledge/new')
    await page.waitForLoadState('networkidle')

    await page.getByText('キャンセル').click()

    // 作成画面から離れて遷移するはず
    await expect(page).not.toHaveURL(/.*#\/knowledge\/new/)
  })
})

test.describe('Knowledge related-inquiry picker (real server)', () => {
  test.describe.configure({ mode: 'serial' })

  const inquiryTitle = `E2E Picker Inquiry ${Date.now()}`
  const knowledgeTitle = `E2E Knowledge with related ${Date.now()}`
  let inquiryOid: string
  let knowledgeOid: string

  test('should create an inquiry to be picked as a related one', async ({
    page,
  }) => {
    await login(page)
    await page.getByText('新規問合せ').click()
    await expect(page.getByText('新規問合せ作成')).toBeVisible()

    await page.locator('input[type="text"]').fill(inquiryTitle)
    await page.locator('textarea').fill('Seed inquiry for the picker test.')
    await page.getByText('問合せを送信').click()

    // 新しい問合せのチャット画面への遷移を待つ
    // (/inquiry/new 自体が /inquiry/[^/]+$ に一致するため、代わりにヘッダーを待つ)
    await expect(page.locator('.chat-header__title')).toContainText(
      inquiryTitle,
      { timeout: 15000 }
    )
    await page.waitForLoadState('networkidle')
    inquiryOid = page.url().split('/inquiry/').pop()!
    expect(inquiryOid).toBeTruthy()
    expect(inquiryOid).not.toBe('new')
  })

  test('should pick the inquiry from the dropdown and persist it on create', async ({
    page,
  }) => {
    await login(page)
    await page.goto('#/knowledge/new')
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('ナレッジのタイトルを入力').fill(knowledgeTitle)
    await page
      .locator('textarea')
      .fill('Knowledge body that references a related inquiry.')

    // picker を開く。キーワード検索は全文検索インデックスに依存し、作成直後の問合せは
    // 反映までヒットしない。picker は開いた時点で最近の問合せを新しい順に読み込むため、
    // 直前に作成した問合せはその一覧に出る。それを直接選ぶ。
    await page.getByRole('button', { name: '問合せを追加' }).click()
    const picker = page.locator('.related-inquiry-picker__dropdown')
    await expect(picker).toBeVisible()

    const option = picker
      .locator('.related-inquiry-picker__option')
      .filter({ hasText: inquiryTitle })
    await expect(option).toHaveCount(1, { timeout: 10000 })
    await option.click()

    // 選択リストには OID ではなく問合せ名が表示されるはず
    const selected = page.locator('.related-inquiry-item')
    await expect(selected).toHaveCount(1)
    await expect(selected).toContainText(inquiryTitle)

    // 送信して新しいナレッジの OID を捕捉
    const createResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/knowledge/create') &&
        res.request().method() === 'POST'
    )
    await page.getByRole('button', { name: '保存' }).click()
    const responseBody = await (await createResponsePromise).json()
    const resultData = responseBody.result?.data ?? responseBody.data
    knowledgeOid = resultData.oid
    expect(knowledgeOid).toBeTruthy()

    await page.waitForURL(new RegExp(`.*#/knowledge/${knowledgeOid}$`), {
      timeout: 15000,
    })
    await page.waitForLoadState('networkidle')
  })

  test('should display the related inquiry on the detail page', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/knowledge/${knowledgeOid}`)
    await page.waitForLoadState('networkidle')

    // 詳細画面に関連問合せが名前付きリンクとして表示される
    const relatedLink = page
      .locator('.knowledge-detail__related a')
      .filter({ hasText: inquiryTitle })
    await expect(relatedLink).toHaveCount(1, { timeout: 10000 })
    await expect(relatedLink).toHaveAttribute(
      'href',
      new RegExp(`#/inquiry/${inquiryOid}$`)
    )
  })
})
