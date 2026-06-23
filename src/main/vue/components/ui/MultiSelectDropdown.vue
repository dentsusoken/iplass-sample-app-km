<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div ref="containerRef" class="multi-select">
    <button
      type="button"
      class="form-control multi-select__trigger"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <span class="multi-select__text">{{ displayText }}</span>
      <AppIcon
        :name="ICON.dropdown"
        size="md"
        class="multi-select__caret"
        :class="{ 'multi-select__caret--open': isOpen }"
      />
    </button>
    <div v-if="isOpen" class="multi-select__dropdown">
      <label
        v-for="option in options"
        :key="option.value"
        class="multi-select__option"
      >
        <input
          type="checkbox"
          :checked="model.includes(option.value)"
          @change="toggle(option.value)"
        />
        <span>{{ option.label }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
  import { useI18n } from 'vue-i18n'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'

  const { t } = useI18n()

  const props = defineProps<{
    options: { value: string; label: string }[]
    placeholder: string
  }>()

  const model = defineModel<string[]>({ required: true })

  const isOpen = ref(false)
  const containerRef = useTemplateRef('containerRef')

  const displayText = computed(() => {
    if (model.value.length === 0) return props.placeholder
    if (model.value.length === 1) {
      const found = props.options.find((o) => o.value === model.value[0])
      return found ? found.label : props.placeholder
    }
    return t('common.count.selected', { count: model.value.length })
  })

  function toggle(value: string) {
    const idx = model.value.indexOf(value)
    const next = [...model.value]
    if (idx >= 0) {
      next.splice(idx, 1)
    } else {
      next.push(value)
    }
    model.value = next
  }

  function onClickOutside(e: MouseEvent) {
    if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
      isOpen.value = false
    }
  }

  onMounted(() => {
    document.addEventListener('click', onClickOutside)
  })

  onUnmounted(() => {
    document.removeEventListener('click', onClickOutside)
  })
</script>

<style scoped>
  .multi-select {
    position: relative;
    min-width: 150px;
  }
  /* トリガー: 選択値を左寄せ・キャレットを右端に置く（select 風表示） */
  .multi-select__trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
    text-align: left;
  }
  .multi-select__text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .multi-select__caret {
    flex-shrink: 0;
    color: var(--color-on-surface-variant);
    transition: transform var(--duration-base) var(--ease-standard);
  }
  .multi-select__caret--open {
    transform: rotate(180deg);
  }
  .multi-select__dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-outline, #ccc);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    max-height: 240px;
    overflow-y: auto;
    margin-top: 2px;
  }
  .multi-select__option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: var(--font-size-sm, 14px);
  }
  .multi-select__option:hover {
    background: var(--color-surface-variant, #f5f5f5);
  }
</style>
