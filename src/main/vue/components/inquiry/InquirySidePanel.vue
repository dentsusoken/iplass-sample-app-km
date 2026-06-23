<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div class="knowledge-panel app-card">
    <div class="app-card__header">
      <span class="knowledge-panel__title">
        <AppIcon :name="ICON.knowledgeSearch" size="sm" />
        {{ t('knowledge.search.title') }}
      </span>
    </div>
    <div class="knowledge-panel__search">
      <input
        v-model="query"
        type="text"
        :placeholder="t('knowledge.search.placeholder')"
        :aria-label="t('knowledge.search.aria')"
        @keyup.enter="search"
      />
    </div>
    <div>
      <div
        v-if="searchError"
        style="
          padding: var(--space-sm);
          font-size: var(--font-size-xs);
          color: var(--color-error);
        "
      >
        {{ searchError }}
      </div>
      <div
        v-else-if="searching"
        class="empty-state"
        style="padding: var(--space-md)"
      >
        <div class="spinner-border spinner-border-sm" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      <template v-else-if="results.length > 0">
        <div
          v-for="item in results"
          :key="item.oid"
          class="knowledge-item"
          @click="openKnowledge(item.oid)"
        >
          <div class="knowledge-item__title">
            <span>{{ item.name }}</span>
            <AppIcon
              :name="ICON.openInNew"
              size="xs"
              class="knowledge-item__external"
            />
          </div>
          <div class="knowledge-item__excerpt">
            {{ truncate(item.content) }}
          </div>
          <div
            v-if="item.tags && item.tags.length > 0"
            class="knowledge-item__tags"
          >
            <TagBadge v-for="tag in item.tags" :key="tag.oid" :tag="tag" />
          </div>
        </div>
      </template>
      <div
        v-else-if="searched"
        class="empty-state"
        style="padding: var(--space-md)"
      >
        <AppIcon
          :name="ICON.emptySearch"
          size="2xl"
          class="empty-state__icon"
        />
        <div class="empty-state__sub">
          {{ t('knowledge.search.empty') }}
        </div>
      </div>
      <div v-else class="empty-state" style="padding: var(--space-md)">
        <AppIcon
          :name="ICON.relatedSearch"
          size="2xl"
          class="empty-state__icon"
        />
        <div class="empty-state__sub">
          {{ t('knowledge.search.initial') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { useApi } from '@/composables/useApi'
  import { toUserMessage } from '@/composables/errors'
  import TagBadge from '@/components/ui/TagBadge.vue'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import { truncate } from '@/utils/text'
  import type { Knowledge } from '@/types/knowledge'

  const props = defineProps<{
    /** 受け取るが未使用 (キーワード検索は問合せ文脈に依存しないため) */
    inquiryOid?: string
  }>()

  void props.inquiryOid

  const { t } = useI18n()
  const router = useRouter()

  const query = ref('')
  const results = ref<Knowledge[]>([])
  const searching = ref(false)
  const searched = ref(false)
  const searchError = ref('')

  async function search() {
    if (!query.value.trim()) return
    searching.value = true
    searched.value = false
    searchError.value = ''
    try {
      const { api } = useApi()
      const res = await api.get<{ data: Knowledge[] }>('/knowledge/search', {
        params: { q: query.value, limit: '10' },
      })
      results.value = res.data
      searched.value = true
    } catch (e) {
      searchError.value = toUserMessage(e, t('knowledge.search.error'))
    } finally {
      searching.value = false
    }
  }

  function openKnowledge(oid: string) {
    const { href } = router.resolve({
      name: 'knowledgeDetail',
      params: { id: oid },
    })
    window.open(href, '_blank', 'noopener')
  }

  // 親が投稿確定時に呼ぶ。キーワード検索パネルは提案を持たないため何もしない。
  function fetchSuggestions() {}

  defineExpose({ fetchSuggestions })
</script>
