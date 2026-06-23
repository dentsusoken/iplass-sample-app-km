<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div class="chat-header">
    <div class="chat-header__left">
      <div class="chat-header__title">{{ inquiry.name }}</div>
      <div class="chat-header__meta">
        <StatusBadge :status="inquiry.status" />
        <TagBadge v-for="tag in inquiry.tags" :key="tag.oid" :tag="tag" />
      </div>
      <div
        style="
          font-size: var(--font-size-xs);
          color: var(--color-on-surface-variant);
        "
      >
        {{
          t('inquiry.header.meta', {
            author: inquiry.createBy.name,
            date: formatDateTime(inquiry.createDate),
          })
        }}
      </div>
    </div>
    <div class="chat-header__right">
      <button
        v-if="isResponder"
        class="btn-app-ghost btn-app-sm"
        @click="emit('editTags')"
      >
        <AppIcon :name="ICON.tagEdit" size="xs" />
        {{ t('inquiry.header.editTags') }}
      </button>
      <span class="chat-header__separator" aria-hidden="true"></span>
      <span class="chat-header__separator" aria-hidden="true"></span>
      <template v-if="isOpenOrAnswered">
        <button
          class="btn-app-secondary btn-app-sm"
          @click="emit('close', 'resolved')"
        >
          <AppIcon :name="ICON.resolve" size="xs" />
          {{ t('inquiry.header.resolve') }}
        </button>
        <button
          class="btn-app-danger btn-app-sm"
          @click="emit('close', 'canceled')"
        >
          <AppIcon :name="ICON.cancel" size="xs" />
          {{ t('inquiry.header.cancel') }}
        </button>
      </template>
      <template v-else>
        <button class="btn-app-secondary btn-app-sm" @click="emit('reopen')">
          {{ t('inquiry.header.reopen') }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import type { Inquiry } from '@/types/inquiry'
  import { useAuth } from '@/composables/useAuth'
  import { formatDateTime } from '@/utils/datetime'
  import StatusBadge from '@/components/ui/StatusBadge.vue'
  import TagBadge from '@/components/ui/TagBadge.vue'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'

  const props = defineProps<{
    inquiry: Inquiry
  }>()

  const emit = defineEmits<{
    close: [resolution: 'resolved' | 'canceled']
    reopen: []
    editTags: []
  }>()

  const { t } = useI18n()
  const { isResponder } = useAuth()

  const isOpenOrAnswered = computed(
    () => props.inquiry.status === 'Open' || props.inquiry.status === 'Answered'
  )
</script>
