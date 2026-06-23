<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <nav
    v-if="totalPages > 1"
    class="app-pagination"
    :aria-label="t('common.aria.pagination')"
  >
    <button
      class="app-pagination__btn"
      :class="{ 'app-pagination__btn--disabled': currentPage <= 1 }"
      :disabled="currentPage <= 1"
      :aria-label="t('common.aria.firstPage')"
      @click="emit('update:currentPage', 1)"
    >
      <AppIcon :name="ICON.firstPage" size="md" />
    </button>
    <button
      class="app-pagination__btn"
      :class="{ 'app-pagination__btn--disabled': currentPage <= 1 }"
      :disabled="currentPage <= 1"
      :aria-label="t('common.aria.prevPage')"
      @click="emit('update:currentPage', currentPage - 1)"
    >
      <AppIcon :name="ICON.chevronLeft" size="md" />
    </button>
    <button
      v-for="page in visiblePages"
      :key="page"
      class="app-pagination__btn"
      :class="{ 'app-pagination__btn--active': page === currentPage }"
      :aria-current="page === currentPage ? 'page' : undefined"
      @click="emit('update:currentPage', page)"
    >
      {{ page }}
    </button>
    <button
      class="app-pagination__btn"
      :class="{ 'app-pagination__btn--disabled': currentPage >= totalPages }"
      :disabled="currentPage >= totalPages"
      :aria-label="t('common.aria.nextPage')"
      @click="emit('update:currentPage', currentPage + 1)"
    >
      <AppIcon :name="ICON.chevronRight" size="md" />
    </button>
    <button
      class="app-pagination__btn"
      :class="{ 'app-pagination__btn--disabled': currentPage >= totalPages }"
      :disabled="currentPage >= totalPages"
      :aria-label="t('common.aria.lastPage')"
      @click="emit('update:currentPage', totalPages)"
    >
      <AppIcon :name="ICON.lastPage" size="md" />
    </button>
  </nav>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'

  const { t } = useI18n()

  const props = defineProps<{
    currentPage: number
    totalPages: number
  }>()

  const emit = defineEmits<{
    'update:currentPage': [page: number]
  }>()

  const visiblePages = computed(() => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, props.currentPage - Math.floor(maxVisible / 2))
    const end = Math.min(props.totalPages, start + maxVisible - 1)
    start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  })
</script>
