/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import LocaleSwitcher from './LocaleSwitcher.vue'

// 言語切替メニューの仕様:
// - ja / en の 2 項目を表示し、現在ロケール (テスト環境では ja) に check を付ける
// - 別言語を選ぶと /user/language/change へ POST し、成功でページをリロードする
// - 現在と同じ言語を選んでも何もしない（POST もリロードもしない）
// - 失敗時はリロードせずトーストで通知する

Object.defineProperty(window, 'tcPath', { value: '', writable: true })

function okJson(body: object) {
  return { ok: true, json: () => Promise.resolve(body) }
}

async function openMenu() {
  const wrapper = mount(LocaleSwitcher)
  await wrapper.find('.locale-switcher__trigger').trigger('click')
  return wrapper
}

describe('LocaleSwitcher', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let reloadMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadMock },
    })
  })

  it('ja / en を表示し、現在ロケール (ja) に check を付ける', async () => {
    const wrapper = await openMenu()
    const items = wrapper.findAll('.locale-switcher__item')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('日本語')
    expect(items[1].text()).toContain('English')
    // 現在ロケールのみ aria-checked=true（並びは ja, en）
    expect(items[0].attributes('aria-checked')).toBe('true')
    expect(items[1].attributes('aria-checked')).toBe('false')
  })

  it('別言語を選ぶと language を渡して POST し、成功でリロードする', async () => {
    fetchMock.mockResolvedValueOnce(
      okJson({ result: { status: 'SUCCESS', data: 'en' } })
    )
    const wrapper = await openMenu()
    await wrapper.findAll('.locale-switcher__item')[1].trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/km/user/language/change',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ language: 'en' }),
      })
    )
    expect(reloadMock).toHaveBeenCalled()
  })

  it('現在と同じ言語を選んでも POST もリロードもしない', async () => {
    const wrapper = await openMenu()
    await wrapper.findAll('.locale-switcher__item')[0].trigger('click')
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('切替が失敗したらリロードしない', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ errorCode: 'INTERNAL', message: 'boom' }),
    })
    const wrapper = await openMenu()
    await wrapper.findAll('.locale-switcher__item')[1].trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalled()
    expect(reloadMock).not.toHaveBeenCalled()
  })
})
