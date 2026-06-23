<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div>
    <div v-if="loading" class="empty-state">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else-if="errorMessage" class="empty-state">
      <p>{{ errorMessage }}</p>
    </div>

    <KnowledgeArticle v-else-if="knowledge" :knowledge="knowledge" />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useApi } from '@/composables/useApi'
  import { toUserMessage } from '@/composables/errors'
  import KnowledgeArticle from '@/components/knowledge/KnowledgeArticle.vue'
  import type { Knowledge } from '@/types/knowledge'

  const props = defineProps<{
    id: string
  }>()

  const { t } = useI18n()
  const { api } = useApi()

  const knowledge = ref<Knowledge | null>(null)
  const loading = ref(false)
  const errorMessage = ref('')

  async function fetchDetail(id: string) {
    loading.value = true
    errorMessage.value = ''
    try {
      const res = await api.get<{ data: Knowledge }>(`/knowledge/detail/${id}`)
      knowledge.value = res.data
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('knowledge.detail.error'))
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchDetail(props.id)
  })

  watch(
    () => props.id,
    (newId) => {
      fetchDetail(newId)
    }
  )
</script>
