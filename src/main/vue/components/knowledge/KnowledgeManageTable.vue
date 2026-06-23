<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div class="app-card">
    <div class="app-table-scroll">
      <table class="app-table">
        <thead>
          <tr>
            <th v-if="selectable" scope="col" class="app-table__check">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate.prop="someSelected"
                :aria-label="t('knowledge.manage.selectAll')"
                @change="emit('toggleSelectAll')"
              />
            </th>
            <th scope="col">{{ t('knowledge.manage.column.title') }}</th>
            <th scope="col">{{ t('knowledge.manage.column.tags') }}</th>
            <th scope="col">{{ t('knowledge.manage.column.visibility') }}</th>
            <th scope="col">{{ t('knowledge.manage.column.updatedAt') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.oid">
            <td v-if="selectable" class="app-table__check">
              <input
                type="checkbox"
                :value="item.oid"
                :checked="selectedOids.includes(item.oid)"
                :aria-label="
                  t('knowledge.manage.selectRow', { name: item.name })
                "
                @change="emit('toggleSelect', item.oid)"
              />
            </td>
            <td>
              <router-link
                :to="{ name: 'knowledgeDetail', params: { id: item.oid } }"
              >
                {{ item.name }}
              </router-link>
              <span v-if="mergedBadge && item.mergedTo" class="merged-mark">
                {{ t('knowledge.manage.merged') }}
              </span>
            </td>
            <td>
              <TagBadge v-for="tag in item.tags" :key="tag.oid" :tag="tag" />
            </td>
            <td>
              <span
                class="visibility-badge"
                :class="`visibility-badge--${item.visibility}`"
                >{{ t(`visibility.${item.visibility}`) }}</span
              >
            </td>
            <td>{{ formatDate(item.updateDate) }}</td>
          </tr>
          <tr v-if="items.length === 0">
            <td :colspan="selectable ? 5 : 4">
              <div class="empty-state">
                <AppIcon
                  :name="ICON.emptySearch"
                  size="4xl"
                  class="empty-state__icon"
                />
                <div class="empty-state__title">
                  {{ t('knowledge.manage.empty') }}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import TagBadge from '@/components/ui/TagBadge.vue'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import type { KnowledgeRow } from '@/types/knowledge'

  const props = withDefaults(
    defineProps<{
      items: KnowledgeRow[]
      selectable?: boolean
      mergedBadge?: boolean
      selectedOids?: string[]
    }>(),
    {
      selectable: false,
      mergedBadge: false,
      selectedOids: () => [],
    }
  )

  const emit = defineEmits<{
    toggleSelect: [oid: string]
    toggleSelectAll: []
  }>()

  const { t } = useI18n()

  const allSelected = computed(
    () =>
      props.items.length > 0 &&
      props.items.every((i) => props.selectedOids.includes(i.oid))
  )
  const someSelected = computed(
    () => props.selectedOids.length > 0 && !allSelected.value
  )

  function formatDate(s: string | null): string {
    if (!s) return ''
    try {
      return new Date(s).toLocaleString('ja-JP')
    } catch {
      return s
    }
  }
</script>

<style scoped>
  .merged-mark {
    margin-left: var(--space-sm);
    font-size: var(--font-size-xs);
    color: var(--color-on-surface-variant);
  }
  /* 長いタイトル等で横幅を超えてもページを崩さずスクロールさせる (InquiryList と同様) */
  .app-table-scroll {
    overflow-x: auto;
  }
  .app-table {
    width: 100%;
    min-width: 680px;
    border-collapse: collapse;
  }
  .app-table th,
  .app-table td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-surface-highest);
    text-align: left;
  }
  .app-table th {
    background: var(--color-surface);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .app-table__check {
    width: 40px;
  }
</style>
