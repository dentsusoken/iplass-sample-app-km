/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { test, expect } from '@playwright/test'
import { setupCommonMocks, sampleInquiryDetail } from './helpers/mock-api'

/**
 * ナレッジ検索のロール別表示テスト
 *
 * - ユーザロール: public ナレッジのみ表示
 * - 回答者ロール: 全ナレッジ（public + internal）表示
 * - バックエンドがロールに応じてフィルタリングを自動適用
 *
 * 役割ベースのフィルタリングそのものはバックエンド側の責務であり、本 mock テスト
 * では「mock が返した結果を UI がそのまま表示すること」しか検証できない。バックエンド
 * の visibility フィルタは JUnit / e2e-integration 側で検証する。
 */

const publicKnowledge = {
  oid: 'kb-001',
  name: 'Public Knowledge Article',
  content: 'This is a public knowledge article about password reset...',
  tags: [{ oid: 'tag-002', tagName: 'Technical' }],
  visibility: 'public',
}

const internalKnowledge = {
  oid: 'kb-002',
  name: 'Internal Knowledge Article',
  content: 'This is an internal article about server configuration...',
  tags: [{ oid: 'tag-001', tagName: 'General' }],
  visibility: 'internal',
}

test.describe('Knowledge Search Visibility - Responder', () => {
  test('should display both public and internal knowledge results', async ({
    page,
  }) => {
    await setupCommonMocks(page, { roles: ['inquiry_responder'] })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )

    // 回答者は全ナレッジを見られる
    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [publicKnowledge, internalKnowledge],
        }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    const searchInput = page.getByPlaceholder('ナレッジを検索...')
    await searchInput.fill('knowledge')
    await searchInput.press('Enter')

    await expect(
      page.getByText('Public Knowledge Article', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText('Internal Knowledge Article', { exact: true })
    ).toBeVisible()
  })
})

test.describe('Knowledge Search Visibility - User', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page, { roles: ['inquiry_user'] })

    await page.route('**/api/km/inquiry/detail/inq-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: sampleInquiryDetail }),
      })
    )
  })

  test('should display only public knowledge results', async ({ page }) => {
    // 利用者は public のナレッジのみ見られる (サーバーが internal を除外)
    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [publicKnowledge],
        }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    const searchInput = page.getByPlaceholder('ナレッジを検索...')
    await searchInput.fill('knowledge')
    await searchInput.press('Enter')

    await expect(
      page.getByText('Public Knowledge Article', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText('Internal Knowledge Article', { exact: true })
    ).not.toBeVisible()
  })

  test('should not display internal knowledge results', async ({ page }) => {
    // 利用者ロールにサーバーが public のみ返す状況を再現
    await page.route('**/api/km/knowledge/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [publicKnowledge],
        }),
      })
    )

    await page.goto('/#/inquiry/inq-001')
    const searchInput = page.getByPlaceholder('ナレッジを検索...')
    await searchInput.fill('server config')
    await searchInput.press('Enter')

    // 結果には public の記事だけが含まれるはず
    await expect(
      page.getByText('Public Knowledge Article', { exact: true })
    ).toBeVisible()
    // internal の記事は表示されないはず
    await expect(
      page.getByText('Internal Knowledge Article', { exact: true })
    ).not.toBeVisible()
  })
})
