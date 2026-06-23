<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div>
    <div class="list-header">
      <h1 class="list-header__title">
        {{ t('inquiry.list.title') }}
        <span class="list-header__count">{{
          t('inquiry.list.count', { count: store.totalCount })
        }}</span>
      </h1>
      <router-link
        :to="{ name: 'inquiryNew' }"
        class="btn-app-primary btn-app-primary-lg"
      >
        <AppIcon :name="ICON.add" size="lg" />
        {{ t('inquiry.list.new') }}
      </router-link>
    </div>

    <InquirySearchForm
      :available-tags="store.availableTags"
      @search="onSearch"
    />

    <div
      v-if="errorMessage"
      class="alert alert-danger alert-dismissible"
      role="alert"
      style="margin-bottom: var(--space-md)"
    >
      {{ errorMessage }}
      <button
        type="button"
        class="btn-close"
        :aria-label="t('common.aria.close')"
        @click="errorMessage = ''"
      ></button>
    </div>

    <div v-if="store.isLoading" class="empty-state">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <template v-else>
      <div class="app-card">
        <div style="overflow-x: auto">
          <table class="data-table">
            <thead>
              <tr>
                <th
                  scope="col"
                  style="width: 40%"
                  class="sortable-header"
                  :class="{ 'sortable-header--active': isSorted('name') }"
                  @click="toggleSort('name')"
                >
                  <span class="sortable-header__inner">
                    {{ t('inquiry.list.column.title') }}
                    <AppIcon
                      :name="sortIconName('name') ?? ICON.sortNone"
                      size="xs"
                      class="sort-indicator"
                      :class="{ 'sort-indicator--active': isSorted('name') }"
                    />
                  </span>
                </th>
                <th
                  scope="col"
                  class="sortable-header"
                  :class="{ 'sortable-header--active': isSorted('status') }"
                  @click="toggleSort('status')"
                >
                  <span class="sortable-header__inner">
                    {{ t('inquiry.list.column.status') }}
                    <AppIcon
                      :name="sortIconName('status') ?? ICON.sortNone"
                      size="xs"
                      class="sort-indicator"
                      :class="{ 'sort-indicator--active': isSorted('status') }"
                    />
                  </span>
                </th>
                <th scope="col">{{ t('inquiry.list.column.tags') }}</th>
                <th scope="col">{{ t('inquiry.list.column.author') }}</th>
                <th
                  scope="col"
                  class="sortable-header"
                  :class="{ 'sortable-header--active': isSorted('createDate') }"
                  @click="toggleSort('createDate')"
                >
                  <span class="sortable-header__inner">
                    {{ t('inquiry.list.column.createdAt') }}
                    <AppIcon
                      :name="sortIconName('createDate') ?? ICON.sortNone"
                      size="xs"
                      class="sort-indicator"
                      :class="{
                        'sort-indicator--active': isSorted('createDate'),
                      }"
                    />
                  </span>
                </th>
                <th scope="col" aria-hidden="true" class="row-chevron-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="inquiry in store.list"
                :key="inquiry.oid"
                @click="goToDetail(inquiry.oid)"
              >
                <td>
                  <div class="table-title">{{ inquiry.name }}</div>
                  <div v-if="inquiry.summaryShort" class="table-meta">
                    {{ inquiry.summaryShort }}
                  </div>
                </td>
                <td>
                  <StatusBadge :status="inquiry.status" />
                </td>
                <td>
                  <div class="table-tags">
                    <TagBadge
                      v-for="tag in inquiry.tags"
                      :key="tag.oid"
                      :tag="tag"
                    />
                  </div>
                </td>
                <td style="font-size: var(--font-size-sm)">
                  {{ inquiry.createBy.name }}
                </td>
                <td
                  style="
                    font-size: var(--font-size-sm);
                    color: var(--color-on-surface-variant);
                  "
                >
                  {{ formatDateTime(inquiry.createDate) }}
                </td>
                <td class="row-chevron-cell">
                  <AppIcon
                    :name="ICON.chevronRight"
                    size="sm"
                    class="row-chevron"
                  />
                </td>
              </tr>
              <tr v-if="store.list.length === 0">
                <td colspan="6">
                  <div class="empty-state">
                    <AppIcon
                      :name="ICON.emptyList"
                      size="4xl"
                      class="empty-state__icon"
                    />
                    <div class="empty-state__title">
                      {{ t('inquiry.list.empty') }}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Pagination
          :current-page="store.currentPage"
          :total-pages="store.totalPages"
          @update:current-page="store.setPage"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { useInquiryStore } from '@/stores/inquiry'
  import { toUserMessage } from '@/composables/errors'
  import { formatDateTime } from '@/utils/datetime'
  import InquirySearchForm from './InquirySearchForm.vue'
  import StatusBadge from '@/components/ui/StatusBadge.vue'
  import TagBadge from '@/components/ui/TagBadge.vue'
  import Pagination from '@/components/ui/Pagination.vue'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import type { InquiryStatus } from '@/types/inquiry'

  const { t } = useI18n()
  const store = useInquiryStore()
  const router = useRouter()
  const errorMessage = ref('')

  onMounted(async () => {
    try {
      await Promise.all([store.fetchList(), store.fetchAvailableTags()])
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('inquiry.list.error.fetch'))
    }
  })

  async function onSearch(condition: {
    statuses?: InquiryStatus[]
    tagOids?: string[]
    keyword?: string
    createDateFrom?: string
    createDateTo?: string
  }) {
    errorMessage.value = ''
    store.setSearchCondition(condition)
    try {
      await store.fetchList()
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('inquiry.list.error.search'))
    }
  }

  function isSorted(field: string): boolean {
    return store.searchCondition.sortField === field
  }

  function sortIconName(field: string): string | null {
    if (store.searchCondition.sortField !== field) return null
    return store.searchCondition.sortOrder === 'ASC'
      ? ICON.sortAsc
      : ICON.sortDesc
  }

  async function toggleSort(field: 'createDate' | 'name' | 'status') {
    const current = store.searchCondition
    if (current.sortField === field) {
      if (current.sortOrder === 'DESC') {
        store.setSearchCondition({ sortField: field, sortOrder: 'ASC' })
      } else {
        // ASC ならデフォルト（ソート解除）に戻す
        store.setSearchCondition({
          sortField: undefined,
          sortOrder: undefined,
        })
      }
    } else {
      store.setSearchCondition({ sortField: field, sortOrder: 'DESC' })
    }
    try {
      await store.fetchList()
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('inquiry.list.error.sort'))
    }
  }

  function goToDetail(oid: string) {
    router.push({ name: 'inquiryChat', params: { id: oid } })
  }
</script>

<style scoped>
  .sortable-header {
    cursor: pointer;
    user-select: none;
  }
  .sortable-header:hover {
    background: var(--color-surface-variant, #f5f5f5);
    color: var(--color-primary);
  }
  .sortable-header--active {
    color: var(--color-primary);
  }
  .sortable-header__inner {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
  }
  /* ソートインジケータ: 非アクティブは不可視→hover で unfold_more 半透明、アクティブは矢印 */
  .sort-indicator {
    opacity: 0;
    color: var(--color-on-surface-variant);
    transition: opacity var(--duration-fast) var(--ease-standard);
  }
  .sortable-header:hover .sort-indicator {
    opacity: 0.5;
  }
  .sort-indicator--active {
    opacity: 1;
    color: var(--color-primary);
  }
  /* 行末のクリック誘導 chevron: 通常は不可視、行 hover で半透明表示 */
  .row-chevron-col {
    width: 32px;
  }
  .row-chevron-cell {
    text-align: right;
    color: var(--color-on-surface-variant);
  }
  .row-chevron {
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-standard);
  }
  .data-table tbody tr:hover .row-chevron {
    opacity: 0.5;
  }
</style>
