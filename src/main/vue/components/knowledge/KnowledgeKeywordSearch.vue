<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div>
    <div
      v-if="searchError"
      class="alert alert-danger"
      style="margin-bottom: var(--space-md)"
    >
      {{ searchError }}
    </div>
    <div v-else-if="searching" class="empty-state">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
    <template v-else-if="results.length > 0">
      <div class="app-card">
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
      </div>
    </template>
    <div
      v-else-if="searched"
      class="empty-state"
      style="padding: var(--space-md)"
    >
      <AppIcon :name="ICON.emptySearch" size="4xl" class="empty-state__icon" />
      <div class="empty-state__title">
        {{ t('knowledge.search.page.empty') }}
      </div>
      <div class="empty-state__sub">
        {{ t('knowledge.search.page.emptySub') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { useApi } from '@/composables/useApi'
  import { toUserMessage } from '@/composables/errors'
  import TagBadge from '@/components/ui/TagBadge.vue'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import { truncate } from '@/utils/text'
  import type { Knowledge } from '@/types/knowledge'

  const props = defineProps<{ query: string }>()

  const { t } = useI18n()
  const router = useRouter()
  const results = ref<Knowledge[]>([])
  const searching = ref(false)
  const searched = ref(false)
  const searchError = ref('')

  watch(
    () => props.query,
    async (query) => {
      if (!query.trim()) return
      searching.value = true
      searched.value = false
      searchError.value = ''
      try {
        const { api } = useApi()
        const res = await api.get<{ data: Knowledge[] }>('/knowledge/search', {
          params: { q: query, limit: '10' },
        })
        results.value = res.data
        searched.value = true
      } catch (e) {
        searchError.value = toUserMessage(
          e,
          t('knowledge.search.page.searchError')
        )
      } finally {
        searching.value = false
      }
    },
    { immediate: true }
  )

  function openKnowledge(oid: string) {
    const { href } = router.resolve({
      name: 'knowledgeDetail',
      params: { id: oid },
    })
    window.open(href, '_blank', 'noopener')
  }
</script>
