/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { reactive } from 'vue'

export type ToastSeverity = 'error' | 'warning' | 'info' | 'success'

export interface Toast {
  id: number
  message: string
  severity: ToastSeverity
}

interface ToastState {
  items: Toast[]
}

// グローバル singleton: `<Toast />` を DefaultLayout に 1 つだけ配置し、
// 全ページから `useToast().show(...)` で呼び出す前提。
const state = reactive<ToastState>({ items: [] })
let nextId = 1
const AUTO_DISMISS_MS = 5000

export interface ToastInput {
  message: string
  severity?: ToastSeverity
}

export function useToast() {
  function show(input: ToastInput): number {
    const id = nextId++
    const toast: Toast = {
      id,
      message: input.message,
      severity: input.severity ?? 'info',
    }
    state.items.push(toast)
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    return id
  }

  function dismiss(id: number): void {
    const idx = state.items.findIndex((t) => t.id === id)
    if (idx >= 0) {
      state.items.splice(idx, 1)
    }
  }

  function clear(): void {
    state.items.splice(0, state.items.length)
  }

  return { items: state.items, show, dismiss, clear }
}
