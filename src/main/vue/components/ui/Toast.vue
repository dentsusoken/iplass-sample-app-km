<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div class="app-toast-stack">
    <!-- .toast は Bootstrap の `.toast:not(.show){display:none}` と衝突して常時非表示になるため、
         `.app-toast` プレフィックスで隔離する -->
    <div
      v-for="toast in items"
      :key="toast.id"
      class="app-toast"
      :class="`app-toast--${toast.severity}`"
      role="status"
    >
      <AppIcon
        :name="SEVERITY_ICON[toast.severity]"
        size="md"
        class="app-toast__icon"
      />
      <span class="app-toast__message">{{ toast.message }}</span>
      <button
        type="button"
        class="app-toast__close"
        :aria-label="t('common.aria.close')"
        @click="dismiss(toast.id)"
      >
        <AppIcon :name="ICON.close" size="md" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useToast, type ToastSeverity } from '@/composables/useToast'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'

  const { t } = useI18n()
  const { items, dismiss } = useToast()

  const SEVERITY_ICON: Record<ToastSeverity, string> = {
    error: ICON.errorInline,
    warning: ICON.warning,
    success: ICON.success,
    info: ICON.info,
  }
</script>

<style scoped>
  .app-toast-stack {
    position: fixed;
    top: var(--space-md);
    right: var(--space-md);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    pointer-events: none;
  }
  .app-toast {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    min-width: 280px;
    max-width: 480px;
    padding: var(--space-sm) var(--space-md);
    background: #ffffff;
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-lg);
    pointer-events: auto;
    font-size: var(--font-size-sm);
    border-left: 4px solid var(--color-info);
    animation: toast-enter var(--duration-base) var(--ease-emphasized);
  }
  .app-toast--error {
    border-left-color: var(--color-error);
  }
  .app-toast--warning {
    border-left-color: var(--color-warning);
  }
  .app-toast--success {
    border-left-color: var(--color-success);
  }
  .app-toast--info {
    border-left-color: var(--color-info);
  }
  /* 重大度アイコンは border-left と同色（色 + アイコンの 2 チャンネルで伝える） */
  .app-toast__icon {
    flex-shrink: 0;
    color: var(--color-info);
  }
  .app-toast--error .app-toast__icon {
    color: var(--color-error);
  }
  .app-toast--warning .app-toast__icon {
    color: var(--color-warning);
  }
  .app-toast--success .app-toast__icon {
    color: var(--color-success);
  }
  .app-toast--info .app-toast__icon {
    color: var(--color-info);
  }
  .app-toast__message {
    flex: 1;
    color: var(--color-on-surface);
    line-height: var(--line-height-normal);
    /* 長い URL 等を含むメッセージで max-width(480px) を超えないよう折り返す */
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .app-toast__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: none;
    background: transparent;
    line-height: 1;
    color: var(--color-on-surface-variant);
    cursor: pointer;
    padding: 0;
  }
  .app-toast__close:hover {
    color: var(--color-on-surface);
  }
</style>
