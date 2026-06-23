<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div>
    <div class="list-header">
      <h1 class="list-header__title">{{ t('knowledge.manage.title') }}</h1>
      <router-link
        :to="{ name: 'knowledgeNew' }"
        class="btn-app-primary btn-app-primary-lg"
      >
        <AppIcon :name="ICON.add" size="lg" />
        {{ t('common.action.create') }}
      </router-link>
    </div>

    <div class="app-card search-bar">
      <div class="input-with-icon search-bar__keyword">
        <AppIcon :name="ICON.search" size="md" class="input-with-icon__icon" />
        <input
          v-model="filter.q"
          type="text"
          class="form-control input-with-icon__input"
          :placeholder="t('knowledge.manage.keyword')"
          :aria-label="t('knowledge.manage.keyword')"
          @keyup.enter="search"
        />
      </div>
      <select
        v-model="filter.tagOid"
        class="form-select search-bar__tag"
        :aria-label="t('knowledge.manage.tagAria')"
      >
        <option value="">{{ t('knowledge.manage.tagAll') }}</option>
        <option v-for="tag in tagList" :key="tag.oid" :value="tag.oid">
          {{ tag.tagName }}
        </option>
      </select>
      <select
        v-model="filter.visibility"
        class="form-select search-bar__visibility"
        :aria-label="t('knowledge.manage.visibilityAria')"
      >
        <option value="">{{ t('knowledge.manage.visibilityAll') }}</option>
        <option value="public">{{ t('visibility.public') }}</option>
        <option value="internal">{{ t('visibility.internal') }}</option>
      </select>
      <div class="search-bar__actions">
        <button class="btn-app-primary btn-app-primary-lg" @click="search">
          <AppIcon :name="ICON.search" size="lg" />
          {{ t('common.action.search') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else-if="errorMessage" class="empty-state">
      <p>{{ errorMessage }}</p>
    </div>

    <KnowledgeManageTable
      v-else
      :items="items"
      :selectable="false"
      :merged-badge="false"
    />

    <!-- pagination は簡易な前後ボタンのみ -->
    <div v-if="totalCount > limit" class="app-pagination">
      <button
        type="button"
        class="btn-app-ghost btn-app-sm"
        :disabled="offset === 0"
        @click="prevPage"
      >
        <AppIcon :name="ICON.chevronLeft" size="xs" />
        {{ t('knowledge.manage.prev') }}
      </button>
      <span class="app-pagination__info">
        {{ offset + 1 }} - {{ Math.min(offset + limit, totalCount) }} /
        {{ totalCount }}
      </span>
      <button
        type="button"
        class="btn-app-ghost btn-app-sm"
        :disabled="offset + limit >= totalCount"
        @click="nextPage"
      >
        {{ t('knowledge.manage.next') }}
        <AppIcon :name="ICON.chevronRight" size="xs" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useApi } from '@/composables/useApi'
  import { toUserMessage } from '@/composables/errors'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import KnowledgeManageTable from '@/components/knowledge/KnowledgeManageTable.vue'
  import { ICON } from '@/constants/icons'
  import type { KnowledgeRow } from '@/types/knowledge'

  const { t } = useI18n()
  const { api } = useApi()

  const filter = reactive({
    q: '',
    tagOid: '',
    visibility: '',
  })

  interface TagRef {
    oid: string
    tagName: string
  }
  const tagList = ref<TagRef[]>([])
  const items = ref<KnowledgeRow[]>([])
  const totalCount = ref(0)
  const offset = ref(0)
  const limit = 20
  const loading = ref(false)
  const errorMessage = ref('')

  async function fetchList() {
    loading.value = true
    errorMessage.value = ''
    try {
      const res = await api.get<{
        data: KnowledgeRow[]
        totalCount: number
        offset: number
        limit: number
      }>('/knowledge/manage', {
        params: {
          q: filter.q.trim() || undefined,
          tagOids: filter.tagOid || undefined,
          visibility: filter.visibility || undefined,
          offset: offset.value,
          limit,
        },
      })
      items.value = res.data ?? []
      totalCount.value = res.totalCount ?? 0
    } catch (e: unknown) {
      errorMessage.value = toUserMessage(e, t('knowledge.manage.error'))
    } finally {
      loading.value = false
    }
  }

  function search() {
    offset.value = 0
    void fetchList()
  }

  function prevPage() {
    if (offset.value === 0) return
    offset.value = Math.max(0, offset.value - limit)
    void fetchList()
  }
  function nextPage() {
    if (offset.value + limit >= totalCount.value) return
    offset.value += limit
    void fetchList()
  }

  async function loadTags() {
    try {
      const res = await api.get<{ data: TagRef[] }>('/tag/list')
      tagList.value = res.data
    } catch {
      // tag list は任意。失敗してもフィルタ機能だけ動作しない
    }
  }

  onMounted(() => {
    void loadTags()
    void fetchList()
  })
</script>

<style scoped>
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }
  .list-header__title {
    font-size: var(--font-size-2xl);
    margin: 0;
  }
  /* フィルタ行(キーワード/タグ/公開範囲) + アクション行。CSS Grid で列幅を割り当て、
     主要アクション(検索)をカード右下に配置する。 */
  .search-bar {
    display: grid;
    grid-template-columns: minmax(220px, 2fr) minmax(150px, 1fr) minmax(
        150px,
        1fr
      );
    gap: var(--space-sm) var(--space-md);
    align-items: end;
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }
  .search-bar__keyword {
    grid-column: 1;
  }
  .search-bar__tag {
    grid-column: 2;
  }
  .search-bar__visibility {
    grid-column: 3;
  }
  /* アクション行: 全幅・右寄せ。検索ボタンをカード右下に配置する */
  .search-bar__actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--space-md);
  }
  @media (max-width: 768px) {
    .search-bar {
      grid-template-columns: 1fr;
    }
    .search-bar__keyword,
    .search-bar__tag,
    .search-bar__visibility {
      grid-column: 1;
    }
  }
  .app-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }
  .app-pagination__info {
    font-size: var(--font-size-sm);
    color: var(--color-on-surface-variant);
  }
</style>
