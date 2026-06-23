lang: [English](./README-EN.md) | [日本語](./README.md)

# iplass-sample-app-km
iPLAssのサンプルアプリ（ナレッジ管理）です。

サンプルアプリの概要については次のドキュメントをご参照ください。

<https://iplass.org/docs/sample/km/>

## Related repositories

* <https://github.com/dentsusoken/iPLAss>

## 環境構築

### 前提ツール

| ツール | 用途 | インストール |
|---|---|---|
| **JDK 21** | Gradle ビルド・Tomcat 実行 | [Amazon Corretto](https://aws.amazon.com/corretto/) 等。`JAVA_HOME` を設定すること |
| **mise** | Tomcat・Node.js のバージョン管理・各種タスク実行 | https://mise.jdx.dev/getting-started.html |

### 環境変数

OSに次の環境変数を設定してください。

| 変数 | 用途 |
|---|---|
| `JAVA_HOME` | JDK パス。ビルド・Tomcat 実行に必要 |
| `CATALINA_HOME` | Gradle の Tomcat タスクが参照する。mise タスク経由（`mise run deploy` 等）の場合は自動で解決されるため手動設定不要 |

### 認証設定

#### npm レジストリ（iPLAss パッケージ取得）

`~/.npmrc` に iPLAss Nexus プライベートレジストリの認証トークンを設定してください。
プロジェクトの `.npmrc` はレジストリ URL のみ含み、トークンは含みません。

#### Maven リポジトリ（iPLAss Java ライブラリ取得）

`gradle.properties` に以下が設定されていること:
- `iPLAssMavenRepoUsername`
- `iPLAssMavenRepoPassword`

### 設定ファイル（各自作成）

以下はリポジトリに含まれないため、各環境で作成が必要です。

#### `e2e-integration/e2e.config.json`

テンプレート `e2e-integration/e2e.config.template.json` を参考に作成:
```json
{
  "port": 8900,
  "contextPath": "<settings.gradle の rootProject.name>",
  "tenantName": "<iPLAss テナント名>",
  "spaPath": "<SPA ページの Action パス>"
}
```

### データベース接続設定

`src/main/resources/mtp-service-config.xml` の `ConnectionFactory` セクションを環境に合わせて設定してください:
- `inherits` — 使用 DB に対応した config（Oracle / PostgreSQL / MySQL / SQL Server）
- `url` / `user` / `password` / `driver`

デフォルトは Oracle 向けの設定です。

#### （Oracleのみ）JDBCドライバの配置

データベースとしてOracle Databaseを利用する場合は、Oracle用のJDBC ドライバを `lib/jdbc/` に配置してください。
deploy タスクがここから Tomcat の `lib/` へコピーします。
**注意**: 不要なドライバを混在させないでください（クラスローディング競合の原因になります）。

### 環境のセットアップ

まず、このサンプルアプリのルートフォルダで `mise trust && mise install` を実行します。
このコマンドにより、開発・テスト用のNode.jsとTomcatがインストールされます。

次に、同じフォルダで `mise run setup` を実行し、その他の依存関係をインストールします。

### iPLAss テナントの作成

`mise run tenant` を実行し、テナントを作成します。
※ `mise run tenant` は内部で `./gradlew runTenantBatch` を実行します。

### デプロイと起動確認

以下いずれかの方法でサンプルアプリをデプロイ・起動できることを確認してください。

- Eclipse等のIDEからデプロイ・起動
- `mise run deploy` コマンドでデプロイ・起動（ポート8900で起動します）

### メタデータ・サンプルデータの取り込み

iPLAssをデプロイ・起動し、Admin Console から本サンプルアプリのメタデータとサンプルデータを順に取り込みます。

1. **メタデータ**: Admin Console の **MetaData Explorer** で [`meta-data/metadata.xml`](meta-data/metadata.xml) をインポートします。
2. **サンプルデータ**: Admin Console の **Packaging** で [`sample-data/entitydata.zip`](sample-data/entitydata.zip) をインポートします。

### テスト用ユーザの作成

このサンプルで提供するJUnitや統合テストの実行には、次の2ユーザが必要です。
管理者ユーザでiPLAssにログインしユーザを作成します。

1. 問合せユーザ
  - アカウントID： `testuser`
  - パスワード： `testuser`
  - グループ： `inquiry_user`

2. 問合せユーザ
  - アカウントID： `testresponder`
  - パスワード： `testresponder`
  - グループ： `inquiry_responder`

## 開発コマンド

開発用にmiseのタスクを定義しています。
これらのタスクでは内部的に npm（フロントエンド）や gradle（Java・Tomcat）を利用しています。

> **前提**: mise タスクは bash で実行されます。Windows では Git Bash 等の bash 環境が必要です。
> 操作対象は mise が管理するテスト用 Tomcat（`.mise.toml` で定義）で、Eclipse 等 IDE で起動する開発用サーバーとは独立しています。ポート競合を避けるため `e2e-integration/e2e.config.json` のポート番号を他サーバーと重複させないでください。

### 1. 初回セットアップ

「環境構築」の認証・設定ファイル・DB 接続を済ませた上で:

```bash
mise trust && mise install   # Node.js・Tomcat をインストール
mise run setup               # npm 依存と Playwright ブラウザをインストール
mise run tenant              # iPLAss テナントを作成
```

### 2. フロントエンド開発（ホットリロード）

```bash
npm run dev                  # Vite 開発サーバー（ポート3000、iPLAss バックエンドへプロキシ）
```

### 3. 整形・静的解析・単体テスト（コミット前）

```bash
mise run fmt                 # Java(Spotless) + フロント(Prettier) を整形
mise run lint                # ESLint で自動修正
mise run test                # フロント単体テスト（Vitest）
mise run test:java           # バックエンド単体テスト（JUnit）
mise run test:mock           # モック UI テスト（Playwright・サーバー不要）
mise run check               # 上記チェックを一括（CI ゲート・サーバー不要）
```

### 4. 実サーバーで動作確認

```bash
mise run build:frontend      # フロントエンド(SPA)のみビルド → src/main/webapp/km/assets/
mise run build:java          # Java(WAR)のみビルド → build/libs/
mise run deploy              # フロント+WAR をビルド → デプロイ → Tomcat 起動
mise run tomcat-stop         # 停止
mise run tomcat-restart      # 再起動（Admin Console での設定変更を反映）
```

### 5. 統合テスト（実サーバー）

```bash
mise run e2e-full            # deploy → health → test → stop を一括（クリーンな状態から）
mise run e2e                 # テストのみ（サーバー起動済みが前提）
```

`mise run e2e` には `--` 経由で Playwright オプションを渡せます:

```bash
mise run e2e -- -g "should create"   # テスト名で絞り込み
mise run e2e -- --headed             # ブラウザ表示あり
mise run e2e -- --trace on           # トレース常時記録（playwright-report-integration/ で確認）
```

### 6. 運用ツール

```bash
mise run crawl               # 全文検索（Lucene）インデックスを更新（反映には mise run tomcat-restart）
mise run config-view         # マージ済 service-config を表示
mise run entity-class        # Entity Java マッピングクラスを生成（対話式）
```

### トラブルシュート

```bash
mise run logs                # app.log からエラーを抽出（mise run logs -- <keyword> で絞り込み）
mise run tomcat-debug        # JPDA デバッグ付きで Tomcat 起動（ポート5005）
mise run e2e-debug           # Playwright Inspector でステップ実行（要サーバー起動）
mise run e2e-ui              # Playwright UI モード（テスト選択・トレース・タイムトラベル）
```

サーバーサイドをデバッグする場合は、`mise run tomcat-debug` で起動した Tomcat にエディタからリモート接続します（IntelliJ / Eclipse の Remote JVM Debug でポート 5005、VS Code は `{ "type": "java", "request": "attach", "hostName": "localhost", "port": 5005 }`）。フロントとサーバーを同時にデバッグするなら `mise run tomcat-debug` と `mise run e2e-debug` を併用します。


## License
[AGPL-3.0](https://www.gnu.org/licenses/agpl.html)
