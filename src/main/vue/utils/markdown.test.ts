/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect } from 'vitest'
import { renderMarkdown, renderMarkdownInline } from './markdown'

/**
 * 本文フォーマット契約の振る舞いを検証する。
 *
 * - 番号付き / 箇条書きリストを <ol>/<ul> として整形する
 * - 保存データ中の <br> を改行として描画する
 * - script 等の危険なタグ・属性を除去する (XSS 安全)
 * - 空 / null は空文字を返す
 */
describe('renderMarkdown', () => {
  it('番号付きリストを <ol>/<li> に整形する', () => {
    const html = renderMarkdown('1. 手順A\n2. 手順B')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>手順A</li>')
    expect(html).toContain('<li>手順B</li>')
  })

  it('箇条書きリストを <ul>/<li> に整形する', () => {
    const html = renderMarkdown('- りんご\n- みかん')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>りんご</li>')
  })

  it('保存データ中の <br> を改行 (<br>) として残す', () => {
    const html = renderMarkdown('1 行目<br>2 行目')
    expect(html).toContain('<br>')
    expect(html).toContain('1 行目')
    expect(html).toContain('2 行目')
  })

  it('許可外の危険なタグ (style) を除去する (XSS 安全)', () => {
    const html = renderMarkdown(
      '安全なテキスト<style>body{display:none}</style>'
    )
    expect(html).not.toContain('<style')
    expect(html).toContain('安全なテキスト')
  })

  it('javascript: スキームの href を無害化する', () => {
    const html = renderMarkdown('<a href="javascript:alert(1)">click</a>')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('click')
  })

  it('危険な属性 (onerror 等) を除去する', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">テキスト')
    expect(html).not.toContain('onerror')
  })

  it('空文字 / null / undefined は空文字を返す', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown(null)).toBe('')
    expect(renderMarkdown(undefined)).toBe('')
  })
})

describe('renderMarkdownInline', () => {
  it('ブロック要素 (<p>) を生成しない', () => {
    const html = renderMarkdownInline('短い要約テキスト')
    expect(html).not.toContain('<p>')
    expect(html).toContain('短い要約テキスト')
  })

  it('強調 (**) をインラインで描画する', () => {
    const html = renderMarkdownInline('**重要**な点')
    expect(html).toContain('<strong>重要</strong>')
  })

  it('空 / null は空文字を返す', () => {
    expect(renderMarkdownInline('')).toBe('')
    expect(renderMarkdownInline(null)).toBe('')
  })
})
