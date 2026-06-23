/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import KnowledgeKeywordSearch from './KnowledgeKeywordSearch.vue'

// キーワード検索パネルの仕様:
// - query prop が非空になると /knowledge/search を呼び、結果カードを描画する
// - 結果 0 件なら空表示、失敗時は alert-danger を出す
// - 空クエリでは検索しない

Object.defineProperty(window, 'tcPath', { value: '', writable: true })

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/knowledge/:id',
        name: 'knowledgeDetail',
        component: { template: '<div />' },
      },
    ],
  })
}

function okJson(body: object) {
  return { ok: true, json: () => Promise.resolve(body) }
}

function mountWithQuery(query: string) {
  return mount(KnowledgeKeywordSearch, {
    props: { query },
    global: { plugins: [makeRouter()] },
  })
}

describe('KnowledgeKeywordSearch', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('query を渡すと検索結果カードを描画する', async () => {
    fetchMock.mockResolvedValueOnce(
      okJson({
        data: [
          { oid: 'k-001', name: 'パスワード再発行', content: '本文', tags: [] },
        ],
      })
    )
    const wrapper = mountWithQuery('パスワード')
    await flushPromises()
    expect(wrapper.text()).toContain('パスワード再発行')
    expect(wrapper.find('.knowledge-item').exists()).toBe(true)
  })

  it('結果 0 件なら空表示を出す', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ data: [] }))
    const wrapper = mountWithQuery('該当なし')
    await flushPromises()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.knowledge-item').exists()).toBe(false)
  })

  it('失敗時は alert-danger を出す', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ errorCode: 'INTERNAL', message: 'boom' }),
    })
    const wrapper = mountWithQuery('エラー')
    await flushPromises()
    expect(wrapper.find('.alert.alert-danger').exists()).toBe(true)
  })

  it('空クエリでは検索しない', () => {
    mountWithQuery('')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
