<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div class="post" :class="isResponderPost ? 'post--responder' : 'post--user'">
    <div class="post__avatar">{{ post.createBy.name.charAt(0) }}</div>
    <div class="post__body">
      <div class="post__bubble">{{ post.content }}</div>
      <div
        v-if="post.attachments.length > 0"
        style="margin-top: var(--space-xs)"
      >
        <FileAttachment
          v-for="att in post.attachments"
          :key="att.lobId"
          :attachment="att"
        />
      </div>
      <div class="post__meta">
        <span class="post__sender">{{ post.createBy.name }}</span>
        <span>{{ formatDateTime(post.createDate) }}</span>
        <span
          v-if="post.updateDate !== post.createDate"
          style="font-style: italic"
        >
          {{ t('inquiry.post.edited') }}
        </span>
        <span
          v-if="isOwnPost && !isClosed"
          class="post__actions"
          @click="emit('edit', post)"
        >
          <AppIcon :name="ICON.edit" size="xs" />
          {{ t('common.action.edit') }}
        </span>
        <span
          v-if="isResponder"
          class="post__actions"
          style="color: var(--color-error)"
          @click="emit('delete', post)"
        >
          <AppIcon :name="ICON.delete" size="xs" />
          {{ t('common.action.delete') }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import type { Post } from '@/types/inquiry'
  import { useAuth } from '@/composables/useAuth'
  import { formatDateTime } from '@/utils/datetime'
  import FileAttachment from '@/components/ui/FileAttachment.vue'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'

  const props = defineProps<{
    post: Post
    isClosed: boolean
    inquiryCreatorOid: string
  }>()

  const emit = defineEmits<{
    edit: [post: Post]
    delete: [post: Post]
  }>()

  const { t } = useI18n()
  const { currentUser, isResponder } = useAuth()

  const isOwnPost = computed(
    () => currentUser.value?.oid === props.post.createBy.oid
  )

  const isResponderPost = computed(
    () => props.post.createBy.oid !== props.inquiryCreatorOid
  )
</script>
