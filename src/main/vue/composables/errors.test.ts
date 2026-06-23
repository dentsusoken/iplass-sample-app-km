/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

import { describe, it, expect } from 'vitest'
import { ApiError } from '@/composables/useApi'
import { resolveErrorMessage } from '@/composables/errors'

// 文言の完全一致ではなく解決経路を検証する (ja.ts の文言変更で壊さないため)。
describe('resolveErrorMessage', () => {
  it('既知の errorCode を最優先でロケール文言に解決する', () => {
    const message = resolveErrorMessage(
      new ApiError(403, 'FORBIDDEN_NOT_RESPONDER', 'Only responders allowed')
    )
    expect(message).toMatch(/回答者/)
    expect(message).not.toContain('Only responders')
  })

  it('errorCode を exceptionType より優先する', () => {
    const message = resolveErrorMessage(
      new ApiError(404, 'INQUIRY_NOT_FOUND', 'raw', 'org.iplass.mtp.Foo')
    )
    expect(message).toMatch(/問合せ/)
  })

  it('errorCode が無ければ exceptionType を末尾クラス名で解決する', () => {
    const message = resolveErrorMessage(
      new ApiError(
        403,
        'UNKNOWN_ERROR',
        'Permission denied',
        'org.iplass.mtp.auth.NoPermissionException'
      )
    )
    expect(message).toMatch(/権限/)
    expect(message).not.toContain('Permission denied')
  })

  it('errorCode も exceptionType も外れたら HTTP status で解決する', () => {
    const message = resolveErrorMessage(
      new ApiError(
        500,
        'UNKNOWN_ERROR',
        'NullPointerException',
        'java.lang.NullPointerException'
      )
    )
    expect(message).toMatch(/サーバー/)
    expect(message).not.toContain('NullPointerException')
  })

  it('未知の status は汎用フォールバックに解決する', () => {
    const message = resolveErrorMessage(
      new ApiError(418, 'UNKNOWN_ERROR', 'I am a teapot')
    )
    expect(message).not.toContain('teapot')
    expect(message.length).toBeGreaterThan(0)
  })

  it('どの経路でもサーバの生メッセージを返さない', () => {
    const cases = [
      new ApiError(403, 'FORBIDDEN_NOT_RESPONDER', 'RAW_SERVER_MESSAGE'),
      new ApiError(
        403,
        'UNKNOWN_ERROR',
        'RAW_SERVER_MESSAGE',
        'org.iplass.mtp.auth.NoPermissionException'
      ),
      new ApiError(500, 'UNKNOWN_ERROR', 'RAW_SERVER_MESSAGE'),
      new ApiError(418, 'UNKNOWN_ERROR', 'RAW_SERVER_MESSAGE'),
    ]
    for (const error of cases) {
      expect(resolveErrorMessage(error)).not.toContain('RAW_SERVER_MESSAGE')
    }
  })
})
