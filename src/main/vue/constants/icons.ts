/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

/**
 * Material Symbols Outlined のアイコン名定数。
 *
 * 文字列直書きを避け、置換漏れ・typo を型で防ぐ。各コンポーネントは AppIcon に
 * `:name="ICON.add"` の形で渡す。新規アイコンは本表に追記してから使う。
 */
export const ICON = {
  // ナビゲーション
  inquiryList: 'forum',
  knowledgeSearch: 'menu_book',
  knowledgeManage: 'library_books',
  brand: 'support_agent',
  language: 'language',

  // アクション
  add: 'add',
  search: 'search',
  send: 'send',
  attach: 'attach_file',
  edit: 'edit',
  delete: 'delete',
  close: 'close',
  menu: 'more_vert',
  copy: 'content_copy',
  save: 'save',
  upload: 'cloud_upload',
  download: 'download',

  // 状態変更
  resolve: 'task_alt',
  cancel: 'do_not_disturb_on',
  tagEdit: 'local_offer',

  // AI
  ai: 'smart_toy',
  aiSuggest: 'lightbulb',
  aiSuggestEmpty: 'lightbulb_outline',
  summarize: 'summarize',
  aiProgress: 'progress_activity',
  merge: 'merge',
  mergeSource: 'call_merge',

  // ステータスバッジ
  statusOpen: 'pending',
  statusAnswered: 'mark_chat_read',
  statusResolved: 'check_circle',
  statusCanceled: 'do_not_disturb_on',

  // ナビゲーション補助
  expandMore: 'expand_more',
  expandLess: 'expand_less',
  chevronRight: 'chevron_right',
  chevronLeft: 'chevron_left',
  firstPage: 'first_page',
  lastPage: 'last_page',
  sortAsc: 'arrow_drop_up',
  sortDesc: 'arrow_drop_down',
  sortNone: 'unfold_more',
  dropdown: 'arrow_drop_down',
  openInNew: 'open_in_new',
  arrowForward: 'arrow_forward',
  listBullet: 'subdirectory_arrow_right',

  // 情報
  bookmark: 'bookmark',
  tag: 'sell',
  link: 'link',
  info: 'info',
  errorInline: 'error_outline',
  warning: 'warning',
  success: 'check_circle',
  help: 'help_outline',

  // 空状態
  emptyList: 'inbox',
  emptySearch: 'search_off',
  emptyKnowledge: 'library_books',

  // 選択
  check: 'check',
  checkBox: 'check_box',
  checkBoxBlank: 'check_box_outline_blank',

  // ナレッジパネル
  relatedSearch: 'manage_search',
} as const

export type IconName = (typeof ICON)[keyof typeof ICON]

/** InquiryStatus → ステータスバッジ用アイコン */
export const STATUS_ICON = {
  Open: ICON.statusOpen,
  Answered: ICON.statusAnswered,
  Resolved: ICON.statusResolved,
  Canceled: ICON.statusCanceled,
} as const
