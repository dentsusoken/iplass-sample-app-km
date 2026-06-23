<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <span class="tag-badge">
    {{ tag.tagName }}
  </span>
</template>

<script setup lang="ts">
  import type { Tag } from '@/types/inquiry'

  defineProps<{
    tag: Tag
  }>()
</script>
