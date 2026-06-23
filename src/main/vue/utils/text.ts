/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

/** テキストを最大文字数で切り詰め、超過分は省略記号 (...) にする。 */
export function truncate(text: string, max = 100): string {
  return text.length > max ? text.substring(0, max) + '...' : text
}
