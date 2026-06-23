/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

/** 問合せステータス */
export type InquiryStatus = 'Open' | 'Answered' | 'Resolved' | 'Canceled'

// iPLAss の JSON シリアライザは null 値のフィールドを省略するため、
// summaryShort・summaryDetail・closedDate 等の nullable フィールドは型に undefined を含める。
/** 問合せ */
export interface Inquiry {
  oid: string
  name: string
  summaryShort?: string | null
  summaryDetail?: string | null
  status: InquiryStatus
  tags: Tag[]
  closedDate?: string | null
  createBy: UserRef
  createDate: string
  posts?: Post[]
}

export interface Post {
  oid: string
  content: string
  attachments: Attachment[]
  createBy: UserRef
  createDate: string
  updateDate: string
}

export interface Attachment {
  name: string
  lobId: string
  type: string
}

export interface UserRef {
  oid: string
  name: string
}

/** 問合せの軽量参照（oid + 表示名）。関連問合せ選択などに使う。 */
export interface InquiryRef {
  oid: string
  name: string
}

export interface Tag {
  oid: string
  tagName: string
}

/** 問合せ検索条件 */
export interface InquirySearchCondition {
  statuses?: InquiryStatus[]
  tagOids?: string[]
  keyword?: string
  createDateFrom?: string
  createDateTo?: string
  sortField?: 'createDate' | 'name' | 'status'
  sortOrder?: 'ASC' | 'DESC'
  offset: number
  limit: number
}
