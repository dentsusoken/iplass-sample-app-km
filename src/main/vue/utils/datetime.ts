/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

/**
 * ISO 日付文字列をロケール表示用の文字列に整形する。
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * ISO 日付文字列を日付のみの表示用文字列に整形する。
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
