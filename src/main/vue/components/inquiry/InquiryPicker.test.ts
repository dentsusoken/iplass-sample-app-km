/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import InquiryPicker from './InquiryPicker.vue'

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

describe('InquiryPicker', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // keyword 無し → 初期候補2件 / keyword あり → 初期候補に無い1件を返す
    fetchMock = vi.fn((url: string) => {
      const u = new URL(url, 'http://localhost')
      const kw = u.searchParams.get('keyword')
      if (kw) {
        return Promise.resolve(
          jsonResponse([{ oid: 'inq-far', name: 'Deep ' + kw }], 1)
        )
      }
      return Promise.resolve(
        jsonResponse(
          [
            { oid: 'inq-001', name: 'Recent A' },
            { oid: 'inq-002', name: 'Recent B' },
          ],
          2
        )
      )
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  function openPicker(wrapper: ReturnType<typeof mount>) {
    return wrapper.find('.btn-app-secondary').trigger('click')
  }

  it('マウント時に keyword なしで /inquiry/list を呼び初期候補を表示する', async () => {
    const wrapper = mount(InquiryPicker, {
      props: { modelValue: [], debounceMs: 0 },
    })
    await flushPromises()

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('/api/km/inquiry/list')
    expect(url).not.toContain('keyword=')

    await openPicker(wrapper)
    expect(wrapper.text()).toContain('Recent A')
    expect(wrapper.text()).toContain('Recent B')
  })

  it('検索入力で keyword 付き検索を行い、初期候補に無い問合せも選べる', async () => {
    const wrapper = mount(InquiryPicker, {
      props: { modelValue: [], debounceMs: 0 },
    })
    await flushPromises()
    await openPicker(wrapper)

    await wrapper.find('input').setValue('xyz')
    await tickTimers()
    await flushPromises()

    // サーバー検索で初期候補に無い問合せが出る（= クライアント全件依存でない）
    const options = wrapper.findAll('.related-inquiry-picker__option')
    const target = options.find((o) => o.text().includes('Deep xyz'))
    expect(target).toBeTruthy()

    await target!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1][0]).toEqual([
      { oid: 'inq-far', name: 'Deep xyz' },
    ])
  })

  it('選択済みの名前は検索結果に無くても表示される（options 非依存）', async () => {
    const wrapper = mount(InquiryPicker, {
      props: {
        modelValue: [{ oid: 'inq-999', name: '検索結果外の問合せ' }],
        debounceMs: 0,
      },
    })
    await flushPromises()
    expect(wrapper.find('.related-inquiry-name').text()).toBe(
      '検索結果外の問合せ'
    )
  })

  it('選択済みは候補から除外される', async () => {
    const wrapper = mount(InquiryPicker, {
      props: {
        modelValue: [{ oid: 'inq-001', name: 'Recent A' }],
        debounceMs: 0,
      },
    })
    await flushPromises()
    await openPicker(wrapper)

    const texts = wrapper
      .findAll('.related-inquiry-picker__option')
      .map((o) => o.text())
    expect(texts.some((t) => t.includes('Recent B'))).toBe(true)
    expect(texts.some((t) => t.includes('Recent A'))).toBe(false)
  })

  it('削除ボタンで選択済みから除去する', async () => {
    const wrapper = mount(InquiryPicker, {
      props: {
        modelValue: [{ oid: 'inq-001', name: 'Recent A' }],
        debounceMs: 0,
      },
    })
    await flushPromises()
    await wrapper.find('.btn-close').trigger('click')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted![emitted!.length - 1][0]).toEqual([])
  })
})
