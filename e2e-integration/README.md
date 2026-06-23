lang: [English](./README-EN.md) | [日本語](./README.md)

# 統合テスト構成

## Playwright 設定

- 設定ファイル: `playwright.integration.config.ts`
- baseURL: `e2e-integration/e2e.config.json` から生成
- ブラウザ: Chromium のみ
- workers: 1（シリアル実行）
- タイムアウト: テスト全体 60秒、アクション 15秒

## ヘルパー

### `helpers/login.ts`

iPLAss のログインフォームを操作してログインする。
デフォルト認証情報: `testresponder` / `testresponder`（inquiry_responder ロール）

## テストデータ前提条件

### タグマスタ（`km.tag.Tag`）

`tag-editing.integration.spec.ts` が以下のタグの存在を前提とする:

| name |
|---|
| test1 |
| test2 |
| test3 |

### メタデータ（Admin Console）

| 設定 | 内容 |
|---|---|
| Binary WebAPI (GET) | inquiry_responder に許可 |
| Entity WebAPI DELETE (`km.inquiry.Post`) | inquiry_responder に許可 |
