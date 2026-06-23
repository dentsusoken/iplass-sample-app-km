/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

/** `<input type="file">` の change イベントから選択ファイルを取り出す。 */
export function filesFromInputEvent(e: Event): File[] {
  const input = e.target as HTMLInputElement
  return Array.from(input.files ?? [])
}

/** ドロップイベントからドロップされたファイルを取り出す。 */
export function filesFromDropEvent(e: DragEvent): File[] {
  return Array.from(e.dataTransfer?.files ?? [])
}
