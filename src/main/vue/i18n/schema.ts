/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

import { ja } from './locales/ja'

/** 全ロケールが従うメッセージスキーマ (ja を source of truth)。en.ts はこの型に従う。 */
export type MessageSchema = typeof ja
