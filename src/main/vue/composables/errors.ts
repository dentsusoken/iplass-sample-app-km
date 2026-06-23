/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

import { i18n } from '@/i18n'
import { ApiError } from '@/composables/useApi'

// Vue コンポーネント外 (composable/store の catch 節) からも呼べるよう
// i18n.global を直接使う純関数にする。
const te = (key: string): boolean => i18n.global.te(key)
const t = (key: string): string => i18n.global.t(key)

/**
 * ApiError をロケール別のユーザ向けメッセージに解決する。
 * errorCode → exceptionType (末尾クラス名) → HTTP status → 汎用 の順で
 * 最初にヒットしたキーを採用し、サーバの生メッセージ (英語) はユーザに出さない。
 */
export function resolveErrorMessage(error: ApiError): string {
  const codeKey = `error.code.${error.errorCode}`
  if (error.errorCode && error.errorCode !== 'UNKNOWN_ERROR' && te(codeKey)) {
    return t(codeKey)
  }

  if (error.exceptionType) {
    const simpleName =
      error.exceptionType.split('.').pop() ?? error.exceptionType
    const exceptionKey = `error.exception.${simpleName}`
    if (te(exceptionKey)) return t(exceptionKey)
  }

  const httpKey = `error.http.${error.status}`
  if (te(httpKey)) return t(httpKey)

  return t('error.fallback.generic')
}

/** 例外をユーザ向け文言へ変換する。ApiError はロケール別メッセージに解決し、それ以外は fallback をそのまま返す。 */
export function toUserMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? resolveErrorMessage(e) : fallback
}
