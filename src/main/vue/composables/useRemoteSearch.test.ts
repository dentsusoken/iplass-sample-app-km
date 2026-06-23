/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useRemoteSearch } from './useRemoteSearch'

/** 手動解決できる Promise（race 検証用） */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('useRemoteSearch', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keyword 変更後、debounce 経過で fetchPage が offset:0 で1回呼ばれる', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: ['a'], totalCount: 1 })
    const s = useRemoteSearch<string>({
      fetchPage,
      pageSize: 20,
      debounceMs: 300,
      immediate: false,
    })

    s.keyword.value = 'abc'
    await nextTick()
    // debounce 経過前は呼ばれない
    expect(fetchPage).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith('abc', { offset: 0, limit: 20 })
    expect(s.items.value).toEqual(['a'])
    expect(s.totalCount.value).toBe(1)
  })

  it('debounce 中の連続変更は最後の1回だけ検索する', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [], totalCount: 0 })
    const s = useRemoteSearch<string>({
      fetchPage,
      debounceMs: 300,
      immediate: false,
    })

    s.keyword.value = 'a'
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)
    s.keyword.value = 'ab'
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)
    s.keyword.value = 'abc'
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)

    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith('abc', { offset: 0, limit: 20 })
  })

  it('連続検索で古いリクエストの結果は破棄される（後着優先）', async () => {
    const d1 = deferred<{ items: string[]; totalCount: number }>()
    const d2 = deferred<{ items: string[]; totalCount: number }>()
    const fetchPage = vi
      .fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise)
    const s = useRemoteSearch<string>({
      fetchPage,
      debounceMs: 0,
      immediate: false,
    })

    s.keyword.value = 'a'
    await nextTick()
    await vi.advanceTimersByTimeAsync(0) // run1 開始（pending）
    s.keyword.value = 'ab'
    await nextTick()
    await vi.advanceTimersByTimeAsync(0) // run2 開始（pending）
    expect(fetchPage).toHaveBeenCalledTimes(2)

    // 新しい run2 を先に解決 → 続けて古い run1 を解決
    d2.resolve({ items: ['new'], totalCount: 1 })
    await nextTick()
    d1.resolve({ items: ['old'], totalCount: 1 })
    await nextTick()

    // 古い結果で上書きされない
    expect(s.items.value).toEqual(['new'])
  })

  it('loadMore で offset を加算して追記し、totalCount で hasMore を判定する', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: ['a', 'b'], totalCount: 3 })
      .mockResolvedValueOnce({ items: ['c'], totalCount: 3 })
    const s = useRemoteSearch<string>({
      fetchPage,
      pageSize: 2,
      debounceMs: 0,
      immediate: true,
    })

    await vi.advanceTimersByTimeAsync(0) // 初期ロード
    expect(s.items.value).toEqual(['a', 'b'])
    expect(s.hasMore.value).toBe(true)

    s.loadMore()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchPage).toHaveBeenLastCalledWith('', { offset: 2, limit: 2 })
    expect(s.items.value).toEqual(['a', 'b', 'c'])
    expect(s.hasMore.value).toBe(false)
  })

  it('immediate:true でマウント相当の初期ロードを行う', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: ['x'], totalCount: 1 })
    const s = useRemoteSearch<string>({
      fetchPage,
      debounceMs: 0,
      immediate: true,
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchPage).toHaveBeenCalledWith('', { offset: 0, limit: 20 })
    expect(s.items.value).toEqual(['x'])
  })
})
