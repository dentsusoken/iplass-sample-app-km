<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div class="rag-search">
    <!-- タイトルは他の一覧画面と同じ全幅・左寄せ list-header (main.css) を使用 -->
    <div class="list-header">
      <h1 class="list-header__title">{{ t('knowledge.search.page.title') }}</h1>
      <router-link
        v-if="isResponder"
        class="btn-app-primary btn-app-primary-lg"
        to="/knowledge/new"
      >
        <AppIcon :name="ICON.add" size="lg" />
        {{ t('nav.knowledgeNew') }}
      </router-link>
    </div>

    <div class="app-card rag-search__form">
      <div style="padding: var(--space-md)">
        <textarea
          v-model="query"
          class="form-control"
          rows="3"
          :placeholder="t('knowledge.search.page.placeholder')"
          style="resize: vertical; margin-bottom: var(--space-sm)"
        ></textarea>
        <div
          style="display: flex; justify-content: flex-end; gap: var(--space-sm)"
        >
          <button
            class="btn-app-primary btn-app-primary-lg"
            :disabled="!query.trim()"
            @click="runKeyword"
          >
            <AppIcon :name="ICON.search" size="lg" />
            {{ t('common.action.search') }}
          </button>
        </div>
      </div>
    </div>

    <KnowledgeKeywordSearch
      v-if="mode === 'keyword'"
      :key="nonce"
      :query="submitted"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useAuth } from '@/composables/useAuth'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import KnowledgeKeywordSearch from '@/components/knowledge/KnowledgeKeywordSearch.vue'

  const { t } = useI18n()
  const { isResponder } = useAuth()

  const query = ref('')
  const submitted = ref('')
  const mode = ref<'keyword' | null>(null)
  // 同じクエリで再度ボタンを押しても子パネルが再検索するよう、:key を更新して再マウントさせる。
  const nonce = ref(0)

  function runKeyword() {
    if (!query.value.trim()) return
    submitted.value = query.value
    mode.value = 'keyword'
    nonce.value++
  }
</script>

<style scoped>
  .rag-search__form {
    margin-bottom: var(--space-lg);
  }
</style>
