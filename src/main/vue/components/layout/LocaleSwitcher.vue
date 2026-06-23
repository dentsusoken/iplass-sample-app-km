<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div ref="rootRef" class="locale-switcher" @keydown.escape="close(true)">
    <button
      ref="triggerRef"
      type="button"
      class="locale-switcher__trigger"
      :aria-label="t('nav.locale.switchAria')"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <AppIcon :name="ICON.language" size="md" />
      <span class="locale-switcher__current">{{
        t(`nav.locale.${current}`)
      }}</span>
      <AppIcon
        :name="ICON.expandMore"
        size="sm"
        class="locale-switcher__caret"
        :class="{ 'locale-switcher__caret--open': isOpen }"
      />
    </button>
    <ul v-if="isOpen" class="locale-switcher__menu" role="menu">
      <li v-for="loc in LOCALES" :key="loc" role="none">
        <button
          type="button"
          role="menuitemradio"
          :aria-checked="loc === current"
          class="locale-switcher__item"
          :class="{ 'is-active': loc === current }"
          @click="select(loc)"
        >
          <AppIcon
            :name="ICON.check"
            size="sm"
            class="locale-switcher__check"
            :class="{ 'locale-switcher__check--hidden': loc !== current }"
          />
          {{ t(`nav.locale.${loc}`) }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
  import { useI18n } from 'vue-i18n'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import { useApi } from '@/composables/useApi'
  import { useToast } from '@/composables/useToast'
  import type { AppLocale } from '@/i18n'

  const LOCALES: AppLocale[] = ['ja', 'en']

  const { t, locale } = useI18n()
  const { api } = useApi()
  const toast = useToast()

  const isOpen = ref(false)
  const rootRef = useTemplateRef('rootRef')
  const triggerRef = useTemplateRef<HTMLButtonElement>('triggerRef')

  // 現在ロケール。vue-i18n の locale は string 型のため、アプリが扱う 'ja' | 'en' に寄せる。
  const current = computed<AppLocale>(() =>
    locale.value === 'en' ? 'en' : 'ja'
  )

  function close(focusTrigger = false) {
    if (!isOpen.value) return
    isOpen.value = false
    if (focusTrigger) triggerRef.value?.focus()
  }

  async function select(loc: AppLocale) {
    close()
    if (loc === current.value) return
    try {
      // ユーザーの言語設定を更新する Command。成功時は新言語でページ全体を再描画する。
      const res = await api.post<{ status?: string }>('/user/language/change', {
        language: loc,
      })
      if (res?.status === 'ERROR') throw new Error('language change failed')
      window.location.reload()
    } catch {
      toast.show({ message: t('nav.locale.error'), severity: 'error' })
    }
  }

  function onClickOutside(e: MouseEvent) {
    if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
      isOpen.value = false
    }
  }

  onMounted(() => document.addEventListener('click', onClickOutside))
  onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
  .locale-switcher {
    position: relative;
  }
  /* ナビリンクと同じ控えめな見た目に揃える（primary 背景に半透明の白文字） */
  .locale-switcher__trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.85);
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: var(--font-size-sm);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--border-radius-sm);
    transition:
      color 0.15s,
      background 0.15s;
  }
  .locale-switcher__trigger:hover {
    color: var(--color-on-primary);
    background: rgba(255, 255, 255, 0.1);
  }
  .locale-switcher__current {
    font-weight: 600;
    white-space: nowrap;
  }
  .locale-switcher__caret {
    transition: transform var(--duration-base) var(--ease-standard);
  }
  .locale-switcher__caret--open {
    transform: rotate(180deg);
  }
  .locale-switcher__menu {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 1000;
    min-width: 150px;
    margin: 4px 0 0;
    padding: 4px 0;
    list-style: none;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-outline, #ccc);
    border-radius: var(--border-radius-sm, 4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  .locale-switcher__item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    font-size: var(--font-size-sm);
    color: var(--color-on-surface, #1d1d1d);
  }
  .locale-switcher__item:hover {
    background: var(--color-surface-variant, #f5f5f5);
  }
  .locale-switcher__item.is-active {
    font-weight: 600;
  }
  .locale-switcher__check {
    color: var(--color-primary);
  }
  /* 非選択行でもラベル位置を揃えるため、チェックは領域を残して隠す */
  .locale-switcher__check--hidden {
    visibility: hidden;
  }
  @media (prefers-reduced-motion: reduce) {
    .locale-switcher__trigger,
    .locale-switcher__caret {
      transition: none;
    }
  }
</style>
