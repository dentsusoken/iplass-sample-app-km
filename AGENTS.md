# AGENTS.md

このファイルは AI コーディングエージェント（Claude Code / Cursor / Copilot / Aider など）が
このリポジトリで作業するためのガイドです。人間向けの `README.md` を補完し、
エージェント向けにアーキテクチャ・規約・コマンドをまとめます。
ユーザからの明示的な指示はこのファイルの記述より優先されます。

## このプロジェクトについて

iPLAss（Java製ローコード基盤、`org.iplass.*`）上に構築したナレッジ管理サンプルアプリ。
バックエンドは iPLAss の Command / Entity / WebAPI、フロントエンドは別ビルドの Vue 3 SPA で、
1 枚の JSP が SPA をブートストラップする構成。CE 版前提（EE 固有の拡張ポイントは空実装で残してある）。

iPLAss 自体の API・設定・機能の仕様は公式ドキュメントを参照する: <https://iplass.org/docs/index.html>
（記憶や一般知識で iPLAss の挙動を推測せず、まず公式ドキュメントで裏取りすること。）

## アーキテクチャ

### リクエストの流れ

```
Vue SPA ──fetch──▶ /{tcPath}/api/km/...  ──▶ @WebApi Command ──▶ EntityManager / EQL ──▶ RDB
   │ (useApi.ts)                              (km.*.command)        (Lucene 全文検索含む)
```

- **エントリ**: `src/main/webapp/jsp/km/index.jsp` が SPA をロードし、サーバー側の値を
  グローバル変数へ注入する: `tcPath`（テナントコンテキストパス）、`staticContentPath`、
  `__INITIAL_AUTH__`（ログインユーザ・ロールの初期状態）。Vue 側はこれらを起点に動く。
- **API クライアント**: `src/main/vue/composables/useApi.ts` が唯一の HTTP 入口。
  ベース URL は `${window.tcPath}/api/km`。`get/post/put/del` を提供。
- **WebAPI ↔ Command**: 各 Command クラスに `@WebApi(name="km/...")` と `@CommandClass` を付与し、
  URL（`/api/km/...`）と処理を紐づける。Command は `execute(RequestContext)` で
  `request.getParam(...)` から入力を取り、結果を `request.setAttribute(...)` で返して
  `"SUCCESS"` / `"ERROR"` を返す。
- **レスポンス規約**: iPLAss WebAPI はレスポンスを `{ status, result }` で包む。
  フロントの `useApi` が `.result` を取り出す。
  自作 Command は `CommandResponseUtil`（`km.common.util`）で
  成功 `{ data: ... }` / 失敗 `{ errorCode, message }` を組み立てる。
  iPLAss 標準 API のエラーは `{ exceptionType, exceptionMessage }` 形式で、`useApi` 側で吸収する。

### データモデル（Entity）

- **メタデータが正本**: Entity 定義（プロパティ・型・参照）は `meta-data/metadata.xml` に格納し、
  Admin Console の MetaData Explorer から **手動インポート**する（Gradle では import しない）。
- **Java マッピングクラス**: `km/*/entity/*.java`（例 `Knowledge.java`, `Inquiry.java`, `Post.java`, `Tag.java`）は
  metadata.xml の定義を写したもの。プロパティ名は `public static final String` 定数（`Knowledge.CONTENT` 等）、
  `DEFINITION_NAME` 定数で Entity 定義名を保持。`getValue/setValue` のラッパが getter/setter。
  metadata.xml を変更したら `mise run entity-class` でマッピングクラスを再生成する。
- **検索**: EQL（`org.iplass.mtp.entity.query.Query` + `Condition`）で組み立てる。
  全文検索は `em.fulltextSearchEntity(query, keyword, option)`（Lucene）。
  Reference 型へ `IsNull` を当てるときは `prop + ".oid"` のようにパス式で指定する（`KnowledgeSearchCommand` 参照）。

### 認可・ロール

ナレッジ管理サンプルは 2 ロール前提: **問合せユーザ**（`inquiry_user`）と **回答者**（`inquiry_responder`）。
`km.common.auth.AuthHelper.isResponder()` が公開範囲フィルタ等の分岐を駆動する
（例: 利用者は `visibility = public` のナレッジのみ検索可能）。

### フロントエンド（Vue 3 SPA）

- ルートは `src/main/vue/`。`@` エイリアス = `src/main/vue`。状態管理は Pinia（`stores/`）、
  ルーティングは vue-router の **hash history**（`router/index.ts`、URL は `#/inquiry/list` 等）。
  i18n は vue-i18n（`i18n/locales/{ja,en}.ts`）。Markdown は markdown-it + DOMPurify。
- ビルド成果物は `src/main/webapp/km/assets/`（`index.js` / `style.css`）へ出力され、index.jsp が配信する。
  Vite 設定は `vite.spa.config.ts`（iife・単一バンドル）。`router/featureRoutes.ts` は CE では空配列で、
  エディション差分の挿入点になっている。

## ビルド・実行コマンド

開発操作は **mise タスクが正準インターフェース**（内部で npm / gradle を呼び、`CATALINA_HOME` を自動解決する）。
mise タスクは **bash で実行**されるため Windows では Git Bash 等が必要。
完全な一覧と初回セットアップ手順は `README.md` を参照。よく使うもの:

```bash
# コミット前チェック（サーバー不要・CI ゲート）
mise run check          # fmt:check + lint + フロント単体(Vitest) + バックエンド単体(JUnit) を一括
mise run fmt            # Java(Spotless/palantir+tab) + フロント(Prettier) を整形

# 単体テスト
mise run test           # フロント単体(Vitest, 1 回実行)
mise run test:java      # バックエンド単体(JUnit) = ./gradlew test
mise run test:mock      # モック UI テスト(Playwright, サーバー不要, e2e/)

# 実サーバー & 統合テスト
mise run deploy         # フロント+WAR ビルド → Tomcat デプロイ → 起動（ポートは e2e.config.json）
mise run e2e            # 統合テスト(Playwright, 要・起動済みサーバー, e2e-integration/)
mise run e2e-full       # deploy → health → e2e → stop を一括
mise run tomcat-restart # Admin Console での設定変更を反映
```

### 単一テストの実行

```bash
# Java(JUnit): 1 クラス / 1 メソッド
./gradlew test --tests 'km.knowledge.command.KnowledgeSearchCommandTest'
./gradlew test --tests 'km.knowledge.command.KnowledgeSearchCommandTest.shouldFilterByVisibility'

# フロント単体(Vitest): ファイル名 / テスト名で絞り込み
npx vitest run src/main/vue/utils/markdown.test.ts
npx vitest run -t 'renders markdown'

# Playwright（モック / 統合）: -- 経由で引数を渡す
mise run test:mock -- -g 'should create'        # e2e/（モック）
mise run e2e -- -g 'should create' --headed     # e2e-integration/（実サーバー）
mise run e2e -- --trace on                       # トレース記録 → playwright-report-integration/
```

## テストの 4 層構成

| 層 | 置き場 | サーバー | 用途 |
|---|---|---|---|
| 単体(Java) | `src/test/java/`（JUnit, `iplass-test`） | 不要 | Command / Entity ロジック |
| 単体(フロント) | `*.test.ts`（Vitest, happy-dom） | 不要 | composable / store / util / コンポーネント |
| UI モック | `e2e/`（Playwright） | 不要 | `page.route()` で API をモックし画面単体を検証 |
| 統合 | `e2e-integration/`（Playwright） | **実 Tomcat** | 実 iPLAss に対する E2E。`e2e.config.json` で接続先を解決 |

統合テストの実行には README 記載の 2 ユーザ（`testuser` / `testresponder`）と
メタデータ・サンプルデータの取り込みが前提。

## 設定・環境の要点

- **DB 接続**: `src/main/resources/mtp-service-config.xml` の `ConnectionFactory`。デフォルトは Oracle 向け。
- **JDBC ドライバ**: MySQL / PostgreSQL / SQL Server は `build.gradle` の `providedRuntime`（Maven Central）の
  コメントアウトを外せば済む。**Oracle の場合のみ** ドライバ jar を `lib/jdbc/` に配置する
  （deploy 時に Tomcat の `lib/` へコピー。複数ドライバを混在させない＝クラスローディング競合）。
- **ローカル設定（リポジトリ非管理）**: `e2e-integration/e2e.config.json`（テンプレートから作成）、
  `lib/jdbc/*.jar`（Oracle 利用時）、`gradle.properties` の iPLAss Maven 認証、`~/.npmrc` の Nexus トークン。
- **全文検索インデックス**: `mise run crawl` で Lucene インデックスを更新（反映には `mise run tomcat-restart`）。
- **マージ済 service-config の確認**: `mise run config-view`。
- **ログ調査**: `mise run logs -- <keyword>`（`app.log` からエラー抽出）。

## コード規約

- Java は Spotless（palantirJavaFormat + リーディングスペース→タブ、未使用 import 除去）。コミット前に `mise run fmt`。
- フロントは ESLint + Prettier。`mise run lint` で自動修正。

## 参考リンク

- iPLAss 公式ドキュメント: <https://iplass.org/docs/index.html>
- ナレッジ管理サンプルの概要: <https://iplass.org/docs/sample/km/>
- iPLAss 本体リポジトリ: <https://github.com/dentsusoken/iPLAss>
