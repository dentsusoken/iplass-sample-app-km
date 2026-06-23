/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export interface RemoteSearchPage<T> {
  items: T[]
  totalCount: number
}

export interface UseRemoteSearchOptions<T> {
  /** 1ページ分を取得する。offset/limit はこの composable が管理する。 */
  fetchPage: (
    keyword: string,
    range: { offset: number; limit: number }
  ) => Promise<RemoteSearchPage<T>>
  /** 1ページの件数（初期ロード・loadMore 共通） */
  pageSize?: number
  /** keyword 入力から検索発火までの debounce(ms) */
  debounceMs?: number
  /** マウント相当の初期ロードを行うか */
  immediate?: boolean
}

export interface UseRemoteSearchReturn<T> {
  keyword: Ref<string>
  items: Ref<T[]>
  totalCount: Ref<number>
  loading: Ref<boolean>
  hasMore: ComputedRef<boolean>
  loadMore: () => void
}

/**
 * keyword をサーバーへ投げて結果をページングで保持する汎用検索 composable。
 * 「全件取得 → クライアント側フィルタ」を置き換え、件数に依存しないUIを実現する。
 */
export function useRemoteSearch<T>(
  options: UseRemoteSearchOptions<T>
): UseRemoteSearchReturn<T> {
  const {
    fetchPage,
    pageSize = 20,
    debounceMs = 300,
    immediate = true,
  } = options

  const keyword = ref('')
  const items = ref([]) as Ref<T[]>
  const totalCount = ref(0)
  const loading = ref(false)

  const hasMore = computed(() => items.value.length < totalCount.value)

  // 後着優先: 連続検索で古いリクエストの結果を無視する
  let requestSeq = 0
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  async function run(replace: boolean) {
    const offset = replace ? 0 : items.value.length
    const seq = ++requestSeq
    loading.value = true
    try {
      const page = await fetchPage(keyword.value, { offset, limit: pageSize })
      if (seq !== requestSeq) return
      items.value = replace ? page.items : [...items.value, ...page.items]
      totalCount.value = page.totalCount
    } finally {
      if (seq === requestSeq) loading.value = false
    }
  }

  function loadMore() {
    if (!loading.value && hasMore.value) run(false)
  }

  watch(keyword, () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => run(true), debounceMs)
  })

  if (immediate) run(true)

  return { keyword, items, totalCount, loading, hasMore, loadMore }
}
