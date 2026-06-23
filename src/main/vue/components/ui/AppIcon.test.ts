/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppIcon from '@/components/ui/AppIcon.vue'

// AppIcon の a11y・描画契約を固定する。アイコン名は ligature でグリフ化されるため、テキスト内容として
// name が出ること、装飾/情報の出し分け（aria-hidden vs role=img+aria-label）が要点。
describe('AppIcon', () => {
  it('name を ligature 用テキストとして描画し material-symbols クラスを持つ', () => {
    const wrapper = mount(AppIcon, { props: { name: 'add' } })
    expect(wrapper.text()).toBe('add')
    expect(wrapper.classes()).toContain('material-symbols-outlined')
  })

  it('label 未指定なら装飾扱い: aria-hidden="true" / role なし', () => {
    const wrapper = mount(AppIcon, { props: { name: 'add' } })
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.attributes('role')).toBeUndefined()
    expect(wrapper.attributes('aria-label')).toBeUndefined()
  })

  it('label 指定なら情報扱い: role="img" + aria-label / aria-hidden なし', () => {
    const wrapper = mount(AppIcon, {
      props: { name: 'check_circle', label: '解決済み' },
    })
    expect(wrapper.attributes('role')).toBe('img')
    expect(wrapper.attributes('aria-label')).toBe('解決済み')
    expect(wrapper.attributes('aria-hidden')).toBeUndefined()
  })

  it('spin 指定で icon-spin クラスが付く', () => {
    const wrapper = mount(AppIcon, {
      props: { name: 'progress_activity', spin: true },
    })
    expect(wrapper.classes()).toContain('icon-spin')
  })

  it('size に応じた font-size トークンと opsz を style に反映する', () => {
    const wrapper = mount(AppIcon, { props: { name: 'add', size: '4xl' } })
    const style = wrapper.attributes('style') ?? ''
    expect(style).toContain('font-size: var(--icon-4xl)')
    expect(style).toContain('--_opsz: 48')
  })

  it('fill 指定で --_fill を 1 にする', () => {
    const wrapper = mount(AppIcon, {
      props: { name: 'check_circle', fill: true },
    })
    expect(wrapper.attributes('style') ?? '').toContain('--_fill: 1')
  })
})
