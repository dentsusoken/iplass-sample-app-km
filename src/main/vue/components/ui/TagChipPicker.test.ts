/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TagChipPicker from './TagChipPicker.vue'

// useApi は window.tcPath を読む
Object.defineProperty(window, 'tcPath', { value: '', writable: true })

function jsonResponse(data: unknown, totalCount: number) {
  return {
    ok: true,
    json: () => Promise.resolve({ result: { data, totalCount } }),
  }
}

/** debounce(0) の setTimeout を1tick進める */
function tickTimers() {
  return new Promise((r) => setTimeout(r, 0))
}

describe('TagChipPicker', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // keyword 無し → 初期候補2件 / keyword あり → 初期候補に無い1件を返す
    fetchMock = vi.fn((url: string) => {
      const kw = new URL(url, 'http://localhost').searchParams.get('keyword')
      if (kw) {
        return Promise.resolve(
          jsonResponse([{ oid: 'tag-far', tagName: 'Deep ' + kw }], 1)
        )
      }
      return Promise.resolve(
        jsonResponse(
          [
            { oid: 'tag-001', tagName: 'General' },
            { oid: 'tag-002', tagName: 'Technical' },
          ],
          2
        )
      )
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  function openPicker(wrapper: ReturnType<typeof mount>) {
    return wrapper.find('.tag-chip-picker__toggle').trigger('click')
  }

  it('マウント時に keyword なしで /tag/list を呼び初期候補を表示する', async () => {
    const wrapper = mount(TagChipPicker, {
      props: { modelValue: [], debounceMs: 0 },
    })
    await flushPromises()

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('/api/km/tag/list')
    expect(url).not.toContain('keyword=')

    await openPicker(wrapper)
    expect(wrapper.text()).toContain('General')
    expect(wrapper.text()).toContain('Technical')
  })

  it('検索入力で keyword 付き検索を行い、初期候補に無いタグも選べる', async () => {
    const wrapper = mount(TagChipPicker, {
      props: { modelValue: [], debounceMs: 0 },
    })
    await flushPromises()
    await openPicker(wrapper)

    await wrapper.find('input').setValue('xyz')
    await tickTimers()
    await flushPromises()

    const options = wrapper.findAll('.tag-chip-picker__option')
    const target = options.find((o) => o.text().includes('Deep xyz'))
    expect(target).toBeTruthy()

    await target!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1][0]).toEqual([
      { oid: 'tag-far', tagName: 'Deep xyz' },
    ])
  })

  it('選択済みタグ名は検索結果に無くても表示される（options 非依存）', async () => {
    const wrapper = mount(TagChipPicker, {
      props: {
        modelValue: [{ oid: 'tag-999', tagName: '検索結果外タグ' }],
        debounceMs: 0,
      },
    })
    await flushPromises()
    expect(wrapper.find('.tag-chip').text()).toContain('検索結果外タグ')
  })

  it('選択済みは候補から除外される', async () => {
    const wrapper = mount(TagChipPicker, {
      props: {
        modelValue: [{ oid: 'tag-001', tagName: 'General' }],
        debounceMs: 0,
      },
    })
    await flushPromises()
    await openPicker(wrapper)

    const texts = wrapper
      .findAll('.tag-chip-picker__option')
      .map((o) => o.text())
    expect(texts.some((t) => t.includes('Technical'))).toBe(true)
    expect(texts.some((t) => t.includes('General'))).toBe(false)
  })

  it('削除ボタンで選択済みから除去する', async () => {
    const wrapper = mount(TagChipPicker, {
      props: {
        modelValue: [{ oid: 'tag-001', tagName: 'General' }],
        debounceMs: 0,
      },
    })
    await flushPromises()
    await wrapper.find('.tag-chip__remove').trigger('click')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted![emitted!.length - 1][0]).toEqual([])
  })
})
