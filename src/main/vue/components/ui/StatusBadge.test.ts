/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from './StatusBadge.vue'
import type { InquiryStatus } from '@/types/inquiry'

// 状態の同定は data-status 属性で行い (テスト・スタイルともこれを使う)、
// 表示文言はロケール辞書から解決する。属性と文言の両方を担保する。
const cases: { status: InquiryStatus; label: string }[] = [
  { status: 'Open', label: 'オープン' },
  { status: 'Answered', label: '回答済' },
  { status: 'Resolved', label: '解決済' },
  { status: 'Canceled', label: 'キャンセル' },
]

describe('StatusBadge', () => {
  for (const { status, label } of cases) {
    it(`${status} は data-status と日本語文言を出す`, () => {
      const wrapper = mount(StatusBadge, { props: { status } })
      const badge = wrapper.find('.status-badge')
      expect(badge.attributes('data-status')).toBe(status.toLowerCase())
      expect(badge.text()).toContain(label)
    })
  }
})
