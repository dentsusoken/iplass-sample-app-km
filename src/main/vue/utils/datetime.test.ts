/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect } from 'vitest'
import { formatDateTime, formatDate } from '@/utils/datetime'

describe('formatDateTime', () => {
  it('should format an ISO string to ja-JP datetime', () => {
    const result = formatDateTime('2026-01-15T10:30:00Z')
    // 結果はタイムゾーン依存のため、期待する部分が含まれるかだけを確認する
    expect(result).toMatch(/2026/)
    expect(result).toMatch(/01/)
    expect(result).toMatch(/15/)
  })
})

describe('formatDate', () => {
  it('should format an ISO string to ja-JP date only', () => {
    const result = formatDate('2026-01-15T10:30:00Z')
    expect(result).toMatch(/2026/)
    expect(result).toMatch(/01/)
    expect(result).toMatch(/15/)
  })

  it('should not include time components', () => {
    const result = formatDate('2026-01-15T10:30:00Z')
    // 日付のみの形式にはコロン区切りの時刻が含まれないはず
    expect(result).not.toMatch(/10:30/)
  })
})
