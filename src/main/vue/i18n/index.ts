/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

import { createI18n } from 'vue-i18n'
import { ja } from './locales/ja'
import { en } from './locales/en'
import type { MessageSchema } from './schema'

export type AppLocale = 'ja' | 'en'

/**
 * 表示ロケールを決定する。本番は index.jsp が window.lang に注入し、
 * dev・未注入時は ja にフォールバックする。地域付き ('ja_JP' 等) も先頭で判定。
 */
function resolveLocale(): AppLocale {
  const raw = (typeof window !== 'undefined' && window.lang) || 'ja'
  return raw.toLowerCase().startsWith('en') ? 'en' : 'ja'
}

export const i18n = createI18n<[MessageSchema], AppLocale, false>({
  legacy: false,
  locale: resolveLocale(),
  fallbackLocale: 'ja',
  messages: { ja, en },
  globalInjection: true,
})
