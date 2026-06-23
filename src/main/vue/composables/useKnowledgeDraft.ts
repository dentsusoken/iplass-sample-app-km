/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

import { useI18n } from 'vue-i18n'
import { useApi } from '@/composables/useApi'
import type { InquiryRef, Tag } from '@/types/inquiry'
import type { KnowledgeGeneratedDraft, Visibility } from '@/types/knowledge'

/** ナレッジ編集・マージ画面が共通で初期化する下書きフォーム。 */
export interface KnowledgeDraftForm {
  name: string
  content: string
  tags: Tag[]
  relatedInquiries: InquiryRef[]
  visibility: Visibility
}

/** ナレッジ生成・マージ草案から編集フォームを初期化する処理を共通化する。 */
export function useKnowledgeDraft() {
  const { api } = useApi()
  const { t } = useI18n()

  // 旧経路（oid のみ）で来たタグの名前をサーバーから解決する（後方互換）。
  async function resolveTagNames(oids: string[]): Promise<Tag[]> {
    try {
      const res = await api.get<{ data: { oid: string; tagName: string }[] }>(
        '/tag/list',
        { params: { oids } }
      )
      return (res.data ?? []).map((t) => ({ oid: t.oid, tagName: t.tagName }))
    } catch {
      return oids.map((oid) => ({ oid, tagName: '' }))
    }
  }

  // 旧経路（oid のみ）で来た関連問合せの名前をサーバーから解決する（後方互換）。
  async function resolveInquiryNames(oids: string[]): Promise<InquiryRef[]> {
    return Promise.all(
      oids.map(async (oid) => {
        try {
          const res = await api.get<{ data: { oid: string; name: string } }>(
            `/inquiry/detail/${oid}`
          )
          return {
            oid,
            name:
              res.data?.name ??
              t('knowledge.edit.inquiryNameFallback', { oid }),
          }
        } catch {
          return { oid, name: t('knowledge.edit.inquiryNameFallback', { oid }) }
        }
      })
    )
  }

  /**
   * history.state.generated の各フィールドを form へ反映する。タグ・関連問合せは
   * name 付き（tags / relatedInquiries）を優先し、旧 oid 配列はサーバー検索で名前解決する。
   */
  async function applyGeneratedDraft(
    form: KnowledgeDraftForm,
    g: KnowledgeGeneratedDraft | undefined
  ): Promise<void> {
    if (!g) return
    if (g.name) form.name = g.name
    if (g.content) form.content = g.content
    if (g.visibility) form.visibility = g.visibility
    if (g.tags && g.tags.length > 0) {
      form.tags = g.tags.map((t) => ({ oid: t.oid, tagName: t.tagName }))
    } else if (g.tagOids && g.tagOids.length > 0) {
      form.tags = await resolveTagNames(g.tagOids)
    }
    if (g.relatedInquiries && g.relatedInquiries.length > 0) {
      form.relatedInquiries = g.relatedInquiries.map((r) => ({
        oid: r.oid,
        name: r.name,
      }))
    } else if (g.relatedInquiryOids && g.relatedInquiryOids.length > 0) {
      form.relatedInquiries = await resolveInquiryNames(g.relatedInquiryOids)
    }
  }

  return { applyGeneratedDraft }
}
