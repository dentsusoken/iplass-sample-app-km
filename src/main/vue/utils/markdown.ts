/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import MarkdownIt from 'markdown-it'
// eslint-disable-next-line import/no-named-as-default -- dompurify の正規のデフォルトインポート
import DOMPurify from 'dompurify'

/**
 * ナレッジ本文・AI 回答・要約の表示フォーマット契約。
 *
 * 生成/マージプロンプトは Markdown 出力を指示し、番号付きリスト等の
 * リッチ表示を前提とする。保存データには改行や `<br>` が混在しうるため、Markdown を
 * 描画しつつ DOMPurify で危険なタグ/属性を除去して XSS を防ぐ。
 */
const md = new MarkdownIt({
  html: true, // 保存データ内の <br> 等を改行として扱う (危険タグは DOMPurify で除去)
  linkify: true, // 素の URL を自動リンク化
  breaks: true, // 単一改行 \n を <br> に変換
})

// リンクは別タブで開き、tabnabbing を防ぐ
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'del',
    's',
    'ul',
    'ol',
    'li',
    'a',
    'code',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'span',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
}

/** Markdown をブロック描画 (段落・リスト等)。返り値は DOMPurify サニタイズ済みで XSS 安全。 */
export function renderMarkdown(src?: string | null): string {
  if (!src) return ''
  return DOMPurify.sanitize(md.render(src), SANITIZE_CONFIG)
}

/** Markdown をインライン描画 (ブロック要素を生成しない)。1 行プレビュー (要約短文) 向け。 */
export function renderMarkdownInline(src?: string | null): string {
  if (!src) return ''
  return DOMPurify.sanitize(md.renderInline(src), SANITIZE_CONFIG)
}
