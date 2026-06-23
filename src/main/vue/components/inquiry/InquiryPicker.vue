<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div class="related-inquiries">
    <ul v-if="model.length > 0" class="related-inquiry-list">
      <li
        v-for="(item, index) in model"
        :key="item.oid"
        class="related-inquiry-item"
      >
        <AppIcon
          :name="ICON.listBullet"
          size="xs"
          class="related-inquiry-bullet"
        />
        <span class="related-inquiry-name">{{ item.name }}</span>
        <button
          type="button"
          class="btn-close btn-close--sm"
          :aria-label="t('common.action.delete')"
          @click="remove(index)"
        >
          &times;
        </button>
      </li>
    </ul>
    <div ref="pickerRef" class="related-inquiry-picker">
      <button
        type="button"
        class="btn-app-secondary btn-app-secondary--sm"
        :aria-expanded="isOpen"
        @click="toggle"
      >
        <AppIcon :name="ICON.add" size="xs" />
        {{ t('inquiry.picker.add') }}
      </button>
      <div v-if="isOpen" class="related-inquiry-picker__dropdown">
        <input
          v-model="keyword"
          type="text"
          class="form-control form-control--sm"
          :placeholder="t('inquiry.picker.searchPlaceholder')"
          :aria-label="t('inquiry.picker.searchAria')"
        />
        <ul class="related-inquiry-picker__list">
          <li
            v-for="inquiry in candidates"
            :key="inquiry.oid"
            class="related-inquiry-picker__option"
            @click="add(inquiry)"
          >
            {{ inquiry.name }}
          </li>
          <li
            v-if="candidates.length === 0"
            class="related-inquiry-picker__empty"
          >
            {{
              loading
                ? t('inquiry.picker.searching')
                : t('inquiry.picker.empty')
            }}
          </li>
          <li
            v-if="hasMore"
            class="related-inquiry-picker__more"
            @click="loadMore"
          >
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
  import type { InquiryRef } from '@/types/inquiry'

  const { pageSize = 100, debounceMs = 300 } = defineProps<{
    /** 初期表示・追加読み込みの1ページ件数 */
    pageSize?: number
    debounceMs?: number
  }>()

  const model = defineModel<InquiryRef[]>({ required: true })

  const { t } = useI18n()
  const { api } = useApi()
  const isOpen = ref(false)
  const pickerRef = useTemplateRef('pickerRef')

  // /inquiry/list を keyword でサーバー検索。全件取得→クライアント filter を置き換える。
  const { keyword, items, loading, hasMore, loadMore } =
    useRemoteSearch<InquiryRef>({
      fetchPage: async (kw, { offset, limit }) => {
        const res = await api.get<{
          data: { oid: string; name: string }[]
          totalCount?: number
        }>('/inquiry/list', {
          params: { keyword: kw || undefined, offset, limit },
        })
        const list = (res.data ?? []).map((i) => ({ oid: i.oid, name: i.name }))
        return { items: list, totalCount: res.totalCount ?? list.length }
      },
      pageSize,
      debounceMs,
      immediate: true,
    })

  // 候補は検索結果から選択済みを除外したもの。選択済みの名前は modelValue 自身が
  // 保持するため、検索結果(部分集合)に含まれなくても表示が消えない。
  const candidates = computed(() => {
    const selected = new Set(model.value.map((i) => i.oid))
    return items.value.filter((i) => !selected.has(i.oid))
  })

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function add(inquiry: InquiryRef) {
    if (model.value.some((i) => i.oid === inquiry.oid)) return
    model.value = [...model.value, { oid: inquiry.oid, name: inquiry.name }]
    isOpen.value = false
  }

  function remove(index: number) {
    const next = [...model.value]
    next.splice(index, 1)
    model.value = next
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
  .related-inquiries {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .related-inquiry-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .related-inquiry-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-surface-variant);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .related-inquiry-bullet {
    color: var(--color-on-surface-variant);
  }

  .related-inquiry-name {
    flex: 1;
    /* 長い問合せ名を行内で折り返す (削除ボタンを押し出さない) */
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .related-inquiry-picker {
    position: relative;
    align-self: flex-start;
  }

  .related-inquiry-picker__dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 1000;
    min-width: 280px;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-outline, #ccc);
    border-radius: var(--radius-sm, 4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    padding: var(--space-xs);
  }

  .related-inquiry-picker__list {
    list-style: none;
    padding: 0;
    margin: var(--space-xs) 0 0 0;
    max-height: 240px;
    overflow-y: auto;
  }

  .related-inquiry-picker__option {
    padding: var(--space-xs) var(--space-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    border-radius: var(--radius-sm, 4px);
  }

  .related-inquiry-picker__option:hover {
    background: var(--color-surface-variant, #f5f5f5);
  }

  .related-inquiry-picker__empty {
    padding: var(--space-xs) var(--space-sm);
    font-size: var(--font-size-xs);
    color: var(--color-on-surface-variant);
  }

  .related-inquiry-picker__more {
    padding: var(--space-xs) var(--space-sm);
    cursor: pointer;
    font-size: var(--font-size-xs);
    color: var(--color-primary, #1976d2);
    text-align: center;
  }

  .related-inquiry-picker__more:hover {
    background: var(--color-surface-variant, #f5f5f5);
  }

  .btn-close--sm {
    background: none;
    border: none;
    cursor: pointer;
    font-size: var(--font-size-md);
    color: var(--color-on-surface-variant);
    padding: 0 var(--space-xs);
  }
</style>
