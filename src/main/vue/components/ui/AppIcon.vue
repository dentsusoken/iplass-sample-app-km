<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <span
    class="material-symbols-outlined app-icon"
    :class="{ 'icon-spin': spin }"
    :style="iconStyle"
    v-bind="a11yAttrs"
    >{{ name }}</span
  >
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { CSSProperties } from 'vue'

  type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'

  const {
    name,
    size = 'md',
    label,
    fill = false,
    spin = false,
  } = defineProps<{
    /** Material Symbols のアイコン名（ligature）。ICON 定数経由で渡す */
    name: string
    /** サイズトークン */
    size?: IconSize
    /** 指定すると情報アイコン (role=img + aria-label)。未指定は装飾 (aria-hidden) */
    label?: string
    /** FILL 軸を 1 にして塗りつぶし表示（active 状態等） */
    fill?: boolean
    /** 回転アニメ（progress_activity 等のローディング） */
    spin?: boolean
  }>()

  // size → font-size の px。opsz は font の軸範囲 20..48 にクランプして size に追従させる。
  const SIZE_PX: Record<IconSize, number> = {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
  }

  const iconStyle = computed<CSSProperties>(() => {
    const px = SIZE_PX[size]
    const opsz = Math.min(48, Math.max(20, px))
    // CSS カスタムプロパティ (--_opsz / --_fill) は TS の CSSProperties 型に無いため as でキャストする。
    return {
      fontSize: `var(--icon-${size})`,
      '--_opsz': opsz,
      '--_fill': fill ? 1 : 0,
    } as CSSProperties
  })

  // 装飾アイコンは aria-hidden、情報アイコンは role=img + aria-label
  const a11yAttrs = computed(() =>
    label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
  )
</script>
