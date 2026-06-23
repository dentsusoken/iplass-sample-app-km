/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import type { Page } from '@playwright/test'

/** 全テスト共通の API モックをセットアップする */
export async function setupCommonMocks(
  page: Page,
  options?: {
    roles?: string[]
    userName?: string
    features?: Record<string, boolean>
  }
) {
  const roles = options?.roles ?? ['inquiry_responder']
  const userName = options?.userName ?? 'Test User'
  const features = options?.features ?? {}

  // ページ読み込み前に __INITIAL_AUTH__ を上書きする (auth ストアはこのグローバルから読み込む)。
  // HTML のインラインスクリプトによる上書きを防ぐため Object.defineProperty を使う。
  await page.addInitScript(
    ({ roles, userName, features }) => {
      Object.defineProperty(window, '__INITIAL_AUTH__', {
        value: {
          user: { oid: 'user-001', name: userName },
          roles,
        },
        writable: false,
        configurable: true,
      })
      Object.defineProperty(window, '__APP_FEATURES__', {
        value: features,
        writable: false,
        configurable: true,
      })
    },
    { roles, userName, features }
  )

  // タグ一覧をモック（サーバー検索を模倣: keyword=tagName 部分一致 / oids=oid 絞り込み）
  await page.route('**/api/km/tag/list*', (route) => {
    const url = new URL(route.request().url())
    const keyword = url.searchParams.get('keyword')
    const oids = url.searchParams.getAll('oids')
    let data = [
      { oid: 'tag-001', tagName: 'General' },
      { oid: 'tag-002', tagName: 'Technical' },
      { oid: 'tag-003', tagName: 'Billing' },
    ]
    if (oids.length > 0) {
      data = data.filter((t) => oids.includes(t.oid))
    } else if (keyword) {
      data = data.filter((t) =>
        t.tagName.toLowerCase().includes(keyword.toLowerCase())
      )
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data, totalCount: data.length }),
    })
  })

  // 類似ナレッジ提案の既存テスト保護: InquiryChat の投稿が成功すると KnowledgeSearch から
  // GET /api/km/ai/inquiry/knowledge-suggest/{oid} が呼ばれる。
  // 個別テストが上書きルートを後付けすれば優先されるため、ここは空応答のデフォルト。
  await page.route('**/api/km/ai/inquiry/knowledge-suggest/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { suggestions: [] } }),
    })
  )
}

export const sampleInquiries = [
  {
    oid: 'inq-001',
    name: 'Login issue on production',
    summaryShort: 'Cannot log in after password reset',
    status: 'Open',
    tags: [{ oid: 'tag-002', tagName: 'Technical' }],
    closedDate: null,
    createBy: { oid: 'user-001', name: 'Test User' },
    createDate: '2026-01-15T10:00:00Z',
  },
  {
    oid: 'inq-002',
    name: 'Billing question',
    summaryShort: 'Invoice discrepancy for January',
    status: 'Answered',
    tags: [{ oid: 'tag-003', tagName: 'Billing' }],
    closedDate: null,
    createBy: { oid: 'user-002', name: 'Another User' },
    createDate: '2026-01-12T08:00:00Z',
  },
  {
    oid: 'inq-003',
    name: 'Feature request: dark mode',
    summaryShort: null,
    status: 'Resolved',
    tags: [{ oid: 'tag-001', tagName: 'General' }],
    closedDate: '2026-01-20T15:00:00Z',
    createBy: { oid: 'user-001', name: 'Test User' },
    createDate: '2026-01-10T09:00:00Z',
  },
]

export const sampleInquiryDetail = {
  ...sampleInquiries[0],
  posts: [
    {
      oid: 'post-001',
      content: 'I cannot log in after resetting my password.',
      attachments: [],
      createBy: { oid: 'user-001', name: 'Test User' },
      createDate: '2026-01-15T10:00:00Z',
      updateDate: '2026-01-15T10:00:00Z',
    },
    {
      oid: 'post-002',
      content: 'Please try clearing your browser cache and cookies.',
      attachments: [
        { name: 'guide.pdf', lobId: 'lob-001', type: 'application/pdf' },
      ],
      createBy: { oid: 'user-003', name: 'Support Staff' },
      createDate: '2026-01-15T11:30:00Z',
      updateDate: '2026-01-15T11:30:00Z',
    },
  ],
}

export const sampleKnowledge = [
  {
    oid: 'kb-001',
    name: 'Password Reset Guide',
    content:
      'Follow these steps to reset your password: 1. Go to the login page 2. Click "Forgot Password" 3. Enter your email...',
    tags: [{ oid: 'tag-002', tagName: 'Technical' }],
    visibility: 'public' as const,
    relatedInquiries: [],
  },
  {
    oid: 'kb-002',
    name: 'Browser Cache Clearing Instructions',
    content:
      'To clear your browser cache: Chrome: Settings > Privacy > Clear browsing data...',
    tags: [{ oid: 'tag-002', tagName: 'Technical' }],
    visibility: 'public' as const,
    relatedInquiries: [],
  },
]

export const sampleKnowledgeDetail = {
  oid: 'kb-001',
  name: 'Password Reset Guide',
  content:
    'Follow these steps to reset your password:\n\n1. Go to the login page\n2. Click "Forgot Password"\n3. Enter your email and submit\n\nA reset link will be sent to your email.<br>The link expires in 24 hours.',
  tags: [{ oid: 'tag-002', tagName: 'Technical' }],
  visibility: 'public' as const,
  relatedInquiries: [
    {
      oid: 'inq-001',
      name: 'Login issue on production',
      summaryShort: 'Cannot log in after password reset',
      status: 'Open' as const,
    },
  ],
  createBy: { oid: 'user-003', name: 'Support Staff' },
  createDate: '2026-01-10T09:00:00Z',
  updateDate: '2026-01-12T14:30:00Z',
}

export const sampleRagResponse = {
  answer:
    'パスワードリセットは、ログイン画面の「パスワードを忘れた方」リンクから行えます。メールアドレスを入力すると、リセット用のリンクが送信されます。',
  sources: [
    {
      oid: 'kb-001',
      name: 'Password Reset Guide',
      content:
        'Follow these steps to reset your password: 1. Go to the login page 2. Click "Forgot Password" 3. Enter your email...',
    },
  ],
}
