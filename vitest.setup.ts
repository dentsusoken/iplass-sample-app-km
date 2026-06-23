/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

import { config } from '@vue/test-utils'
import { i18n } from '@/i18n'

// i18n 化したコンポーネントは useI18n() を呼ぶため、全 mount で i18n を有効にする。
config.global.plugins.push(i18n)
