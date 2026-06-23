<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <form class="search-bar" @submit.prevent="onSearch">
    <!-- 検索条件ブロック: キーワード / ステータス / タグ / 作成日 -->
    <div class="search-bar__conditions">
      <div class="search-bar__row">
        <div class="form-group form-group--keyword">
          <div class="input-with-icon">
            <AppIcon
              :name="ICON.search"
              size="md"
              class="input-with-icon__icon"
            />
            <input
              v-model="form.keyword"
              type="text"
              class="form-control input-with-icon__input"
              :placeholder="t('inquiry.search.keywordPlaceholder')"
              :aria-label="t('inquiry.search.keywordAria')"
            />
          </div>
        </div>
        <div class="form-group">
          <MultiSelectDropdown
            v-model="form.statuses"
            :options="statusOptions"
            :placeholder="t('inquiry.search.statusAll')"
          />
        </div>
        <div class="form-group">
          <MultiSelectDropdown
            v-model="form.tagOids"
            :options="tagOptions"
            :placeholder="t('inquiry.search.tagAll')"
          />
        </div>
      </div>
      <div class="form-control search-bar__daterange">
        <span class="search-bar__daterange-label">{{
          t('inquiry.search.dateLabel')
        }}</span>
        <input
          v-model="form.createDateFrom"
          type="date"
          :max="form.createDateTo || undefined"
          class="search-bar__daterange-input"
          :aria-label="t('inquiry.search.dateFromAria')"
        />
        <span class="search-bar__daterange-sep" aria-hidden="true">〜</span>
        <input
          v-model="form.createDateTo"
          type="date"
          :min="form.createDateFrom || undefined"
          class="search-bar__daterange-input"
          :aria-label="t('inquiry.search.dateToAria')"
        />
      </div>
    </div>

    <!-- アクションブロック: 検索ボタン (条件とは別グループ、右寄せ) -->
    <div class="search-bar__actions">
      <button type="submit" class="btn-app-primary btn-app-primary-lg">
        <AppIcon :name="ICON.search" size="lg" />
        {{ t('common.action.search') }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
  import { reactive, computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import type { InquiryStatus, Tag } from '@/types/inquiry'
  import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown.vue'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'

  const { t } = useI18n()

  const statuses: InquiryStatus[] = ['Open', 'Answered', 'Resolved', 'Canceled']

  const statusOptions = computed(() =>
    statuses.map((s) => ({ value: s, label: t(`status.${s}`) }))
  )

  const props = defineProps<{
    availableTags: Tag[]
  }>()

  const tagOptions = computed(() =>
    props.availableTags.map((t) => ({ value: t.oid, label: t.tagName }))
  )

  const emit = defineEmits<{
    search: [
      condition: {
        statuses?: InquiryStatus[]
        tagOids?: string[]
        keyword?: string
        createDateFrom?: string
        createDateTo?: string
      },
    ]
  }>()

  const form = reactive({
    statuses: [] as string[],
    tagOids: [] as string[],
    keyword: '',
    createDateFrom: '',
    createDateTo: '',
  })

  function onSearch() {
    emit('search', {
      statuses: form.statuses.length
        ? (form.statuses as InquiryStatus[])
        : undefined,
      tagOids: form.tagOids.length ? form.tagOids : undefined,
      keyword: form.keyword || undefined,
      createDateFrom: form.createDateFrom || undefined,
      createDateTo: form.createDateTo || undefined,
    })
  }
</script>

<style scoped>
  /* 検索条件ブロックとアクションブロックを分離した検索バー
     (ナレッジ管理画面と同じ「条件 + 右下アクション」構成)。 */
  .search-bar {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  /* 検索条件ブロック: キーワード行 + 作成日行 */
  .search-bar__conditions {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  /* キーワード(伸長) / ステータス / タグ を 1 行に */
  .search-bar__row {
    display: grid;
    grid-template-columns: minmax(220px, 2fr) minmax(150px, 1fr) minmax(
        150px,
        1fr
      );
    gap: var(--space-sm);
    align-items: end;
  }

  /* grid セル内でコントロールを広げる。main.css の flex/min-width はリセット */
  .search-bar__row .form-group {
    min-width: 0;
  }
  /* キーワード入力の leading search アイコンは main.css .input-with-icon を使用 */

  /* 作成日レンジを 1 つの form-control 風コントロールに統一する。
     枠線・角丸・パディング・高さはキーワード入力/ドロップダウンと同じ .form-control を
     そのまま継承し、ネイティブ date input が浮いて見える問題を解消する。
     中の input は枠なし・透明背景にして、外側のチップだけが境界線を持つ。 */
  .search-bar__daterange {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: auto;
    align-self: flex-start;
    white-space: nowrap;
    color: var(--color-on-surface-variant);
  }
  /* 枠全体で 1 つのコントロールとしてフォーカスリングを出す（他コントロールの :focus と同じ） */
  .search-bar__daterange:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(0, 105, 111, 0.12);
  }
  .search-bar__daterange-label,
  .search-bar__daterange-sep {
    color: var(--color-on-surface-variant);
  }
  /* 各日付は白地 + 下線で「入力できる個別フィールド」と示す（塗りつぶしは無効フィールドと誤読されるため避ける）。
     幅は内容にスナップ。 */
  .search-bar__daterange-input {
    width: min-content;
    border: none;
    border-bottom: 2px solid var(--color-surface-highest);
    border-radius: 0;
    background: transparent;
    padding: 1px 2px;
    font: inherit;
    color: var(--color-on-surface);
  }
  /* フォーカス中のフィールドは下線をティールにして、どちらを編集中か明示する */
  .search-bar__daterange-input:focus {
    outline: none;
    border-bottom-color: var(--color-primary);
  }
  .search-bar__daterange-input::-webkit-datetime-edit {
    padding: 0;
  }
  .search-bar__daterange-input:focus {
    outline: none;
  }
  /* ネイティブのカレンダーアイコンを控えめにして他コントロールと主張度を揃える */
  .search-bar__daterange-input::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.5;
    padding-left: 2px;
    transition: opacity var(--transition-fast);
  }
  .search-bar__daterange-input::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
  }

  /* アクションブロック: 検索ボタンを右寄せ (検索条件とは別グループ) */
  .search-bar__actions {
    display: flex;
    justify-content: flex-end;
  }

  @media (max-width: 768px) {
    .search-bar__row {
      grid-template-columns: 1fr;
    }
  }
</style>
