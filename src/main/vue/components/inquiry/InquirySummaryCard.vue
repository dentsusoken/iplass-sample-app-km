<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div v-if="visible" class="summary-card app-card">
    <div class="summary-card__header">
      <span class="summary-card__label">
        <AppIcon
          :name="ICON.summarize"
          size="md"
          class="summary-card__label-icon"
        />
        {{ t('inquiry.summary.label') }}
      </span>
      <button
        type="button"
        class="summary-card__toggle"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{ t('inquiry.summary.detail') }}
        <AppIcon
          :name="ICON.expandMore"
          size="sm"
          class="collapsible-toggle-icon"
          :class="{ expanded }"
        />
      </button>
    </div>
    <!-- eslint-disable vue/no-v-html -- renderMarkdown(Inline) は DOMPurify でサニタイズ済 -->
    <div class="summary-card__short markdown-body" v-html="renderedShort"></div>
    <div
      v-if="expanded && summaryDetail"
      class="summary-card__detail markdown-body"
      v-html="renderedDetail"
    ></div>
    <!-- eslint-enable vue/no-v-html -->
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useAuth } from '@/composables/useAuth'
  import { renderMarkdown, renderMarkdownInline } from '@/utils/markdown'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'

  const props = defineProps<{
    summaryShort?: string | null
    summaryDetail?: string | null
  }>()

  const { t } = useI18n()
  const { isResponder } = useAuth()
  const expanded = ref(false)

  const renderedShort = computed(() => renderMarkdownInline(props.summaryShort))
  const renderedDetail = computed(() => renderMarkdown(props.summaryDetail))

  // responder 限定 + summaryShort が空文字 / null / 空白のみのときは表示しない
  const visible = computed(
    () =>
      isResponder.value &&
      typeof props.summaryShort === 'string' &&
      props.summaryShort.trim() !== ''
  )
</script>

<style scoped>
  .summary-card {
    border-left: 3px solid var(--color-primary);
    padding: var(--space-md) var(--space-lg);
    margin-bottom: var(--space-md);
    background: #ffffff;
  }
  .summary-card__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-sm);
  }
  .summary-card__label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-on-surface);
  }
  .summary-card__label-icon {
    color: var(--color-primary);
  }
  .summary-card__toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    border: none;
    background: transparent;
    font-size: var(--font-size-xs);
    color: var(--color-primary);
    cursor: pointer;
    padding: 0;
    transition: color 200ms ease;
  }
  .summary-card__toggle:hover {
    color: var(--color-primary-dark);
  }
  .summary-card__short {
    font-size: var(--font-size-base);
    line-height: var(--line-height-normal);
    color: var(--color-on-surface);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .summary-card__detail {
    margin-top: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-surface-highest);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    color: var(--color-on-surface);
  }
</style>
