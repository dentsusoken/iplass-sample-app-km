<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <span
    class="status-badge"
    :class="`status-badge--${status.toLowerCase()}`"
    :data-status="status.toLowerCase()"
  >
    <AppIcon :name="STATUS_ICON[status]" size="xs" />
    <span>{{ t(`status.${status}`) }}</span>
  </span>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import type { InquiryStatus } from '@/types/inquiry'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { STATUS_ICON } from '@/constants/icons'

  const { t } = useI18n()

  defineProps<{
    status: InquiryStatus
  }>()
</script>
