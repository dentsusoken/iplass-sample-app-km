/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import type { InquiryRef, InquiryStatus, Tag, UserRef } from './inquiry'

/** 公開範囲 */
export type Visibility = 'internal' | 'public'

export interface Knowledge {
  oid: string
  name: string
  content: string
  tags: Tag[]
  visibility: Visibility
  relatedInquiries: {
    oid: string
    name: string
    summaryShort?: string | null
    status?: InquiryStatus
  }[]
  createBy?: UserRef
  createDate?: string
  updateDate?: string
  /** マージ済の場合、統合先ナレッジの参照 (name は UI 表示用に eager fetch) */
  mergedTo?: { oid: string; name: string | null } | null
}

/** 作成・更新フォーム入力 */
export interface KnowledgeForm {
  name: string
  content: string
  tagOids: string[]
  relatedInquiryOids: string[]
  visibility: Visibility
}

/** ナレッジ生成 / マージ草案から編集画面へ渡す下書き（history.state 経由で受け渡す）。 */
export interface KnowledgeGeneratedDraft {
  name?: string
  content?: string
  tags?: Tag[]
  tagOids?: string[]
  relatedInquiries?: InquiryRef[]
  relatedInquiryOids?: string[]
  visibility?: Visibility
}

/** ナレッジ編集画面が history.state から受け取るナビゲーション状態。 */
export interface KnowledgeEditNavState {
  generated?: KnowledgeGeneratedDraft
}

/** 管理一覧テーブルが 1 行として描画するナレッジ。 */
export interface KnowledgeRow {
  oid: string
  name: string
  tags: { oid: string; tagName: string }[]
  visibility: Visibility
  updateDate: string | null
  mergedTo: { oid: string } | null
}

/** ナレッジマージ画面が history.state から受け取るナビゲーション状態。 */
export interface KnowledgeMergeNavState extends KnowledgeEditNavState {
  mergedFromOids?: string[]
  mergedFrom?: { oid: string; name: string | null }[]
}
