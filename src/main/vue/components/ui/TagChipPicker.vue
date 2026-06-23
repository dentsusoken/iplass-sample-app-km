<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div ref="pickerRef" class="tag-chip-picker">
    <div v-if="model.length > 0" class="tag-chip-picker__chips">
      <span v-for="tag in model" :key="tag.oid" class="tag-chip">
        {{ tag.tagName }}
        <button
          type="button"
          class="tag-chip__remove"
          :aria-label="t('common.action.delete')"
          @click="remove(tag.oid)"
        >
          <AppIcon :name="ICON.close" size="xs" />
        </button>
      </span>
    </div>

    <div class="tag-chip-picker__control">
      <button
        type="button"
        class="form-control tag-chip-picker__toggle"
        :aria-expanded="isOpen"
        @click="toggle"
      >
        <AppIcon :name="ICON.add" size="md" />
        <span class="tag-chip-picker__toggle-label">{{
          t('common.tag.add')
        }}</span>
        <AppIcon
          :name="ICON.dropdown"
          size="md"
          class="tag-chip-picker__caret"
          :class="{ 'tag-chip-picker__caret--open': isOpen }"
        />
      </button>
      <div v-if="isOpen" class="tag-chip-picker__dropdown">
        <input
          v-model="keyword"
          type="text"
          class="form-control form-control--sm"
          :placeholder="t('common.tag.searchPlaceholder')"
          :aria-label="t('common.tag.searchAria')"
        />
        <ul class="tag-chip-picker__list">
          <li
            v-for="opt in candidates"
            :key="opt.oid"
            class="tag-chip-picker__option"
            @click="add(opt)"
          >
            {{ opt.tagName }}
          </li>
          <li v-if="candidates.length === 0" class="tag-chip-picker__empty">
            {{ loading ? t('common.tag.searching') : t('common.tag.empty') }}
          </li>
          <li v-if="hasMore" class="tag-chip-picker__more" @click="loadMore">
            {{ t('common.action.loadMore') }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useApi } from '@/composables/useApi'
  import { useRemoteSearch } from '@/composables/useRemoteSearch'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import type { Tag } from '@/types/inquiry'

  const { pageSize = 100, debounceMs = 300 } = defineProps<{
    /** 初期表示・追加読み込みの1ページ件数 */
    pageSize?: number
    debounceMs?: number
  }>()

  const model = defineModel<Tag[]>({ required: true })

  const { t } = useI18n()
  const { api } = useApi()
  const isOpen = ref(false)
  const pickerRef = useTemplateRef('pickerRef')

  // /tag/list を keyword でサーバー検索。全件取得→クライアント filter を置き換える。
  const { keyword, items, loading, hasMore, loadMore } = useRemoteSearch<Tag>({
    fetchPage: async (kw, { offset, limit }) => {
      const res = await api.get<{
        data: { oid: string; tagName: string }[]
        totalCount?: number
      }>('/tag/list', {
        params: { keyword: kw || undefined, offset, limit },
      })
      const list = (res.data ?? []).map((t) => ({
        oid: t.oid,
        tagName: t.tagName,
      }))
      return { items: list, totalCount: res.totalCount ?? list.length }
    },
    pageSize,
    debounceMs,
    immediate: true,
  })

  // 候補は検索結果から選択済みを除外。選択済みの名前は modelValue 自身が保持するため、
  // 検索結果(部分集合)に含まれなくてもチップ表示が消えない。
  const candidates = computed(() => {
    const selected = new Set(model.value.map((t) => t.oid))
    return items.value.filter((t) => !selected.has(t.oid))
  })

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function add(tag: Tag) {
    if (model.value.some((t) => t.oid === tag.oid)) return
    model.value = [...model.value, { oid: tag.oid, tagName: tag.tagName }]
    isOpen.value = false
  }

  function remove(oid: string) {
    model.value = model.value.filter((t) => t.oid !== oid)
  }

  function onClickOutside(e: MouseEvent) {
    if (
      isOpen.value &&
      pickerRef.value &&
      !pickerRef.value.contains(e.target as Node)
    ) {
      isOpen.value = false
    }
  }

  onMounted(() => document.addEventListener('click', onClickOutside))
  onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
  .tag-chip-picker {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .tag-chip-picker__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 2px 4px 2px 10px;
    border-radius: var(--border-radius-full);
    font-size: var(--font-size-xs);
    font-weight: 500;
    background: var(--color-secondary-container);
    color: var(--color-on-secondary-container);
    /* タグ名はユーザ定義で長くなりうるため折り返す */
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  .tag-chip__remove {
    display: inline-flex;
    align-items: center;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    line-height: 1;
    padding: 0 var(--space-xs);
    opacity: 0.7;
  }
  .tag-chip__remove:hover {
    opacity: 1;
  }
  .tag-chip-picker__control {
    position: relative;
    align-self: flex-start;
    min-width: 240px;
  }
  .tag-chip-picker__toggle {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    text-align: left;
    cursor: pointer;
    color: var(--color-on-surface-variant);
  }
  .tag-chip-picker__toggle-label {
    flex: 1;
    min-width: 0;
  }
  .tag-chip-picker__caret {
    flex-shrink: 0;
    transition: transform var(--duration-base) var(--ease-standard);
  }
  .tag-chip-picker__caret--open {
    transform: rotate(180deg);
  }
  .tag-chip-picker__dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-outline, #ccc);
    border-radius: var(--radius-sm, 4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    padding: var(--space-xs);
  }
  .tag-chip-picker__list {
    list-style: none;
    padding: 0;
    margin: var(--space-xs) 0 0 0;
    max-height: 240px;
    overflow-y: auto;
  }
  .tag-chip-picker__option {
    padding: var(--space-xs) var(--space-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    border-radius: var(--radius-sm, 4px);
  }
  .tag-chip-picker__option:hover {
    background: var(--color-surface-variant, #f5f5f5);
  }
  .tag-chip-picker__empty {
    padding: var(--space-xs) var(--space-sm);
    font-size: var(--font-size-xs);
    color: var(--color-on-surface-variant);
  }
  .tag-chip-picker__more {
    padding: var(--space-xs) var(--space-sm);
    cursor: pointer;
    font-size: var(--font-size-xs);
    color: var(--color-primary, #1976d2);
    text-align: center;
  }
  .tag-chip-picker__more:hover {
    background: var(--color-surface-variant, #f5f5f5);
  }
</style>
