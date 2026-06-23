<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <a
    href="#"
    class="post__attachment"
    :class="{ 'post__attachment--downloading': downloading }"
    @click.prevent="download"
  >
    <AppIcon
      :name="downloading ? ICON.aiProgress : ICON.attach"
      size="xs"
      :spin="downloading"
    />
    {{ attachment.name }}
    <span v-if="error" class="post__attachment-error">{{ error }}</span>
  </a>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useApi } from '@/composables/useApi'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import type { Attachment } from '@/types/inquiry'

  const props = defineProps<{
    attachment: Attachment
  }>()

  const { t } = useI18n()
  const { api } = useApi()
  const downloading = ref(false)
  const error = ref<string | null>(null)

  async function download() {
    if (downloading.value) return
    downloading.value = true
    error.value = null
    try {
      await api.downloadFile(
        `/api/mtp/bin/${props.attachment.lobId}`,
        props.attachment.name
      )
    } catch {
      error.value = t('common.error.downloadFailed')
    } finally {
      downloading.value = false
    }
  }
</script>
