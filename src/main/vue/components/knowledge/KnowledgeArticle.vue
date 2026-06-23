<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div class="app-card">
    <div class="app-card__header">
      <h1 class="knowledge-detail__title">{{ knowledge.name }}</h1>
      <router-link
        v-if="isResponder"
        :to="{ name: 'knowledgeEdit', params: { id: knowledge.oid } }"
        class="btn-app-secondary"
      >
        <AppIcon :name="ICON.edit" size="md" />
        {{ t('common.action.edit') }}
      </router-link>
    </div>

    <div class="app-card__body">
      <div
        v-if="isResponder || knowledge.tags.length > 0"
        class="knowledge-detail__tags"
      >
        <span
          v-if="isResponder"
          class="visibility-badge"
          :class="`visibility-badge--${knowledge.visibility}`"
          >{{ t(`visibility.${knowledge.visibility}`) }}</span
        >
        <TagBadge v-for="tag in knowledge.tags" :key="tag.oid" :tag="tag" />
      </div>

      <!-- eslint-disable vue/no-v-html -- renderMarkdown は DOMPurify でサニタイズ済 -->
      <div
        class="knowledge-detail__content markdown-body"
        v-html="renderedContent"
      ></div>
      <!-- eslint-enable vue/no-v-html -->

      <!-- 公開範囲セクション (responder 限定) -->
      <div v-if="isResponder" class="knowledge-detail__section">
        <h3 class="knowledge-detail__section-title">
          {{ t('knowledge.detail.visibility') }}
        </h3>
        <span
          class="visibility-badge"
          :class="`visibility-badge--${knowledge.visibility}`"
          >{{ t(`visibility.${knowledge.visibility}`) }}</span
        >
      </div>

      <div
        v-if="
          isResponder &&
          knowledge.relatedInquiries &&
          knowledge.relatedInquiries.length > 0
        "
        class="knowledge-detail__section knowledge-detail__related"
      >
        <h3 class="knowledge-detail__section-title">
          {{
            t('knowledge.detail.relatedCount', {
              count: knowledge.relatedInquiries.length,
            })
          }}
        </h3>
        <ul>
          <li
            v-for="inquiry in knowledge.relatedInquiries"
            :key="inquiry.oid"
            class="knowledge-detail__related-item"
          >
            <router-link
              :to="{ name: 'inquiryChat', params: { id: inquiry.oid } }"
            >
              {{ inquiry.name }}
            </router-link>
            <StatusBadge v-if="inquiry.status" :status="inquiry.status" />
          </li>
        </ul>
      </div>

      <!-- 質問者向け誘導リンク -->
      <p v-if="!isResponder" class="knowledge-detail__cta">
        <I18nT keypath="knowledge.detail.cta" tag="span">
          <template #link>
            <router-link :to="{ name: 'inquiryNew' }">{{
              t('knowledge.detail.ctaLink')
            }}</router-link>
          </template>
        </I18nT>
      </p>
    </div>

    <div v-if="isResponder && knowledge.createBy" class="app-card__footer">
      <span class="knowledge-detail__meta">
        {{ t('knowledge.detail.author', { name: knowledge.createBy.name }) }}
      </span>
      <span v-if="knowledge.createDate" class="knowledge-detail__meta">
        {{
          t('knowledge.detail.createdDate', {
            date: formatDate(knowledge.createDate),
          })
        }}
      </span>
      <span v-if="knowledge.updateDate" class="knowledge-detail__meta">
        {{
          t('knowledge.detail.updatedDate', {
            date: formatDate(knowledge.updateDate),
          })
        }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n, I18nT } from 'vue-i18n'
  import { useAuth } from '@/composables/useAuth'
  import TagBadge from '@/components/ui/TagBadge.vue'
  import StatusBadge from '@/components/ui/StatusBadge.vue'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import type { Knowledge } from '@/types/knowledge'
  import { renderMarkdown } from '@/utils/markdown'

  const props = defineProps<{
    knowledge: Knowledge
  }>()

  const { t } = useI18n()
  const { isResponder } = useAuth()

  const renderedContent = computed(() =>
    renderMarkdown(props.knowledge.content)
  )

  function formatDate(s: string): string {
    return new Date(s).toLocaleDateString('ja-JP')
  }
</script>

<style scoped>
  .knowledge-detail__title {
    font-size: var(--font-size-2xl, 1.5rem);
    font-weight: 600;
    margin: 0;
    /* 編集ボタンと並ぶ flex 子要素。長いナレッジ名を折り返してボタンを押し出さない */
    min-width: 0;
    overflow-wrap: anywhere;
  }
  /* 長いタイトル時に編集ボタンが潰れないよう幅を維持する */
  .knowledge-detail__title + a {
    flex-shrink: 0;
  }

  .knowledge-detail__tags {
    display: flex;
    align-items: center;
    gap: var(--space-xs, 0.25rem);
    flex-wrap: wrap;
    margin-bottom: var(--space-md, 1rem);
  }

  .knowledge-detail__content {
    color: var(--color-on-surface);
  }

  .knowledge-detail__section {
    margin-top: var(--space-lg, 1.5rem);
    border-top: 1px solid var(--color-surface-highest, #e0e0e0);
    padding-top: var(--space-md, 1rem);
  }

  .knowledge-detail__section-title {
    font-size: var(--font-size-md, 1rem);
    font-weight: 600;
    margin-bottom: var(--space-sm, 0.5rem);
  }

  .knowledge-detail__related ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .knowledge-detail__related-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm, 0.5rem);
    padding: var(--space-xs, 0.25rem) 0;
  }
  /* 問合せ名 (リンク) は折り返し、ステータスバッジは縮めない */
  .knowledge-detail__related-item > a {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .knowledge-detail__related-item :deep(.status-badge) {
    flex-shrink: 0;
  }

  .knowledge-detail__cta {
    margin-top: var(--space-lg, 1.5rem);
    text-align: center;
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--color-on-surface-variant, #666);
  }

  .knowledge-detail__meta {
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--color-on-surface-variant, #666);
  }
</style>
