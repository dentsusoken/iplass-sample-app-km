<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div class="chat-input">
    <textarea
      v-model="content"
      class="chat-input__area"
      :rows="rows"
      :placeholder="placeholderText"
      :aria-label="t('inquiry.post.contentAria')"
    ></textarea>
    <div class="chat-input__actions">
      <div>
        <label class="chat-input__file-btn">
          <AppIcon :name="ICON.attach" size="xs" />
          {{ t('inquiry.post.attach') }}
          <input
            type="file"
            multiple
            style="display: none"
            @change="onFileChange"
          />
        </label>
        <span
          v-if="files.length > 0"
          style="
            margin-left: var(--space-sm);
            font-size: var(--font-size-xs);
            color: var(--color-on-surface-variant);
          "
        >
          {{ t('inquiry.post.fileCount', { count: files.length }) }}
        </span>
      </div>
      <button
        class="btn-app-primary"
        :disabled="!content.trim() || submitting"
        @click="onSubmit"
      >
        <AppIcon :name="ICON.send" size="md" />
        {{ submitLabelText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import { filesFromInputEvent } from '@/utils/files'

  const {
    submitLabel = '',
    initialContent = '',
    placeholder = '',
    rows = 3,
    submitHandler,
  } = defineProps<{
    submitLabel?: string
    initialContent?: string
    placeholder?: string
    rows?: number
    submitHandler: (payload: {
      content: string
      files: File[]
    }) => Promise<void>
  }>()

  // 未指定 (空文字) のときロケール辞書の既定文言にフォールバックする。
  const { t } = useI18n()
  const submitLabelText = computed(
    () => submitLabel || t('inquiry.post.submit')
  )
  const placeholderText = computed(
    () => placeholder || t('inquiry.post.placeholder')
  )

  const content = ref(initialContent)
  const files = ref<File[]>([])
  const submitting = ref(false)

  function onFileChange(e: Event) {
    files.value = filesFromInputEvent(e)
  }

  async function onSubmit() {
    if (!content.value.trim() || submitting.value) return
    submitting.value = true
    try {
      await submitHandler({ content: content.value, files: files.value })
      content.value = ''
      files.value = []
    } finally {
      submitting.value = false
    }
  }
</script>
