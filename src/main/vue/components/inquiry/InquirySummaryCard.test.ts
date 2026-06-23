/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import InquirySummaryCard from './InquirySummaryCard.vue'

/**
 * 要約カード (InquirySummaryCard) の振る舞いを検証する。
 *
 * - responder ロール + summaryShort 非空のときカードを表示
 * - summaryShort が null / 空文字 / 空白のみのとき非表示
 * - responder 以外のロールでは表示しない
 * - 初期表示は summaryDetail を折りたたみ状態
 * - 「詳細▼」/「詳細▲」のクリックで展開・折りたたみ
 */

function asResponder() {
  globalThis.__INITIAL_AUTH__ = {
    user: { oid: 'user-001', name: 'Responder' },
    roles: ['inquiry_responder'],
  }
  setActivePinia(createPinia())
}

function asNonResponder() {
  globalThis.__INITIAL_AUTH__ = {
    user: { oid: 'user-002', name: 'User' },
    roles: ['inquiry_user'],
  }
  setActivePinia(createPinia())
}

describe('InquirySummaryCard - 表示制御', () => {
  beforeEach(() => {
    asResponder()
  })

  it('responder + summaryShort 非空のときカードを表示し、ラベル「要約」と本文を含む', () => {
    const wrapper = mount(InquirySummaryCard, {
      props: {
        summaryShort: 'パスワードリセット後にログインできない件',
        summaryDetail: '詳細本文',
      },
    })
    expect(wrapper.text()).toContain('要約')
    expect(wrapper.text()).toContain('パスワードリセット後にログインできない件')
  })

  it('summaryShort が null のときカード自体を描画しない', () => {
    const wrapper = mount(InquirySummaryCard, {
      props: {
        summaryShort: null,
        summaryDetail: '詳細',
      },
    })
    expect(wrapper.text()).toBe('')
  })

  it('summaryShort が空文字のときカード自体を描画しない', () => {
    const wrapper = mount(InquirySummaryCard, {
      props: {
        summaryShort: '',
        summaryDetail: '詳細',
      },
    })
    expect(wrapper.text()).toBe('')
  })

  it('summaryShort が空白のみのときカード自体を描画しない', () => {
    const wrapper = mount(InquirySummaryCard, {
      props: {
        summaryShort: '   ',
        summaryDetail: '詳細',
      },
    })
    expect(wrapper.text()).toBe('')
  })

  it('responder 以外のロールでは描画しない (summaryShort 非空でも)', () => {
    asNonResponder()
    const wrapper = mount(InquirySummaryCard, {
      props: {
        summaryShort: 'この要約は表示されないはず',
        summaryDetail: '詳細',
      },
    })
    expect(wrapper.text()).toBe('')
  })
})

describe('InquirySummaryCard - 折りたたみ', () => {
  beforeEach(() => {
    asResponder()
  })

  it('初期表示は summaryDetail を表示しない (折りたたみ状態)', () => {
    const wrapper = mount(InquirySummaryCard, {
      props: {
        summaryShort: 'short',
        summaryDetail: 'DETAIL_MARKER',
      },
    })
    expect(wrapper.text()).not.toContain('DETAIL_MARKER')
  })

  it('初期表示は折りたたみ状態の「詳細」トグルを表示する', () => {
    const wrapper = mount(InquirySummaryCard, {
      props: {
        summaryShort: 'short',
        summaryDetail: 'detail',
      },
    })
    const toggle = wrapper.find('button[aria-expanded]')
    expect(toggle.exists()).toBe(true)
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.text()).toContain('詳細')
  })

  it('「詳細」をクリックすると summaryDetail を展開し aria-expanded が true になる', async () => {
    const wrapper = mount(InquirySummaryCard, {
      props: {
        summaryShort: 'short',
        summaryDetail: 'DETAIL_MARKER',
      },
    })
    await wrapper.find('button[aria-expanded]').trigger('click')
    expect(wrapper.text()).toContain('DETAIL_MARKER')
    const toggle = wrapper.find('button[aria-expanded]')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(toggle.text()).toContain('詳細')
  })

  it('展開状態で再クリックすると折りたたみに戻る', async () => {
    const wrapper = mount(InquirySummaryCard, {
      props: {
        summaryShort: 'short',
        summaryDetail: 'DETAIL_MARKER',
      },
    })
    const btn = wrapper.find('button[aria-expanded]')
    await btn.trigger('click')
    expect(wrapper.text()).toContain('DETAIL_MARKER')
    await btn.trigger('click')
    expect(wrapper.text()).not.toContain('DETAIL_MARKER')
    expect(
      wrapper.find('button[aria-expanded]').attributes('aria-expanded')
    ).toBe('false')
  })

  it('summaryDetail が null のときは展開しても何も表示されず、トグル自体は描画される', async () => {
    const wrapper = mount(InquirySummaryCard, {
      props: {
        summaryShort: 'short only',
        summaryDetail: null,
      },
    })
    const btn = wrapper.find('button[aria-expanded]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    // summaryDetail が null なら本文表示なし
    expect(wrapper.text()).not.toMatch(/DETAIL/)
  })
})
