/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'
import { join } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'

// アップロード用の一時テストファイルを作成
const tmpDir = join(process.cwd(), 'e2e-integration', '.tmp')
mkdirSync(tmpDir, { recursive: true })
const testFilePath = join(tmpDir, 'test-doc.txt')
writeFileSync(testFilePath, 'E2E test attachment content')
const testFile2Path = join(tmpDir, 'test-doc2.txt')
writeFileSync(testFile2Path, 'Second attachment for E2E test')

test.describe('File Attachment (real server)', () => {
  test.describe.configure({ mode: 'serial' })

  let inquiryOid: string

  test('should create inquiry with file attachment', async ({ page }) => {
    await login(page)

    // 新規問合せフォームへ移動
    await page.getByText('新規問合せ').click()
    await expect(page.getByText('新規問合せ作成')).toBeVisible()

    // タイトルと本文を入力
    const title = `Attachment Test ${Date.now()}`
    await page.locator('input[type="text"]').fill(title)
    await page.locator('textarea').fill('Testing file attachment upload.')

    // 隠しファイル入力からファイルをアップロード
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // ファイル件数のテキストを検証
    await expect(
      page.getByText('1 件のファイルが選択されています')
    ).toBeVisible()

    // 送信
    await page.getByText('問合せを送信').click()

    // チャット画面への遷移を待つ
    await page.waitForURL(/.*#\/inquiry\/[^/]+$/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.chat-header__title')).toContainText(title, {
      timeout: 10000,
    })

    // OID を取り出す
    inquiryOid = page.url().split('/inquiry/').pop()!
    expect(inquiryOid).toBeTruthy()

    // 添付ファイルのリンクが表示されることを検証
    await expect(page.locator('.post__attachment')).toBeVisible()
    await expect(page.getByText('test-doc.txt')).toBeVisible()
  })

  test('should use fetch-based download (not direct link)', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 添付リンクは Binary API の直リンクであってはならない
    const attachmentLink = page.locator('.post__attachment').first()
    await expect(attachmentLink).toBeVisible()
    const href = await attachmentLink.getAttribute('href')
    expect(href).toBe('#')
  })

  test('should download file successfully', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    const attachmentLink = page.locator('.post__attachment').first()
    await expect(attachmentLink).toBeVisible()

    // クリックで fetch + blob ダウンロードが発火する
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await attachmentLink.click()
    const download = await downloadPromise

    // ダウンロードしたファイル名を検証
    expect(download.suggestedFilename()).toBe('test-doc.txt')
  })

  test('should attach file to reply post', async ({ page }) => {
    await login(page)
    await page.goto(`#/inquiry/${inquiryOid}`)
    await page.waitForLoadState('networkidle')

    // 返信内容を入力
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible()
    await textarea.fill('Reply with attachment.')

    // 投稿フォームでファイルをアップロード
    const fileInput = page.locator('.chat-input__file-btn input[type="file"]')
    await fileInput.setInputFiles(testFilePath)
    await expect(page.getByText('1 件選択')).toBeVisible()

    // 送信
    const sendBtn = page
      .locator('button')
      .filter({ hasText: /送信|投稿/ })
      .first()
    await sendBtn.click()

    // 添付付きの新しい投稿が表示されるのを待つ
    await expect(page.getByText('Reply with attachment.')).toBeVisible({
      timeout: 10000,
    })

    // 添付リンクが 2 つになるはず (元 + 返信)
    const attachments = page.locator('.post__attachment')
    await expect(attachments).toHaveCount(2, { timeout: 5000 })
  })

  test('should attach multiple files to new inquiry', async ({ page }) => {
    await login(page)

    // 新規問合せフォームへ移動
    await page.getByText('新規問合せ').click()
    await expect(page.getByText('新規問合せ作成')).toBeVisible()

    // フォームに入力
    await page
      .locator('input[type="text"]')
      .fill(`Multi-Attach Test ${Date.now()}`)
    await page.locator('textarea').fill('Testing multiple file attachments.')

    // 複数ファイルをアップロード
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testFilePath, testFile2Path])

    // 件数を検証
    await expect(
      page.getByText('2 件のファイルが選択されています')
    ).toBeVisible()

    // 送信
    await page.getByText('問合せを送信').click()
    await page.waitForURL(/.*#\/inquiry\/[^/]+$/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // 両方の添付リンクが表示されるはず
    await expect(page.getByText('test-doc.txt')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText('test-doc2.txt')).toBeVisible()
  })
})
