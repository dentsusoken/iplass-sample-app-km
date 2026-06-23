/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

/** 日本語ロケール。全 i18n キーの source of truth (en.ts はこの型に従う)。 */
export const ja = {
  error: {
    // Command が返す errorCode。ユーザが次に取るべきアクションを示唆する短い文言にする。
    code: {
      FORBIDDEN_NOT_RESPONDER: 'この機能は回答者ロールのユーザのみ利用できます',
      VALIDATION_ERROR: '入力内容が正しくありません',
      INQUIRY_NOT_FOUND: '対象の問合せが見つかりません',
      KNOWLEDGE_NOT_FOUND: '対象のナレッジが見つかりません',
      POST_NOT_FOUND: '対象の投稿が見つかりません',
      NOT_FOUND: '対象が見つかりません',
    },
    // iPLAss 標準 API がエラー時に返す exceptionType (末尾クラス名で解決する)。
    exception: {
      NoPermissionException: 'この操作を行う権限がありません',
      LoginException:
        'セッションの有効期限が切れました。再度ログインしてください',
      NeedTrustedAuthenticationException: '追加の認証が必要です',
      ApplicationException: 'サーバーでエラーが発生しました',
    },
    // errorCode も exceptionType も未知のときの HTTP ステータス別フォールバック。
    http: {
      '401': 'ログインが必要です',
      '403': 'この操作を行う権限がありません',
      '404': '対象が見つかりません',
      '500': 'サーバーでエラーが発生しました',
    },
    fallback: {
      generic:
        '予期しないエラーが発生しました。しばらく経ってから再試行してください',
    },
  },
  // 問合せステータス。StatusBadge 等が値 (Open 等) をキーに t() で引くため英語値のまま。
  status: {
    Open: 'オープン',
    Answered: '回答済',
    Resolved: '解決済',
    Canceled: 'キャンセル',
  },
  visibility: {
    public: '公開',
    internal: '内部',
  },
  common: {
    action: {
      save: '保存',
      cancel: 'キャンセル',
      edit: '編集',
      delete: '削除',
      create: '作成',
      search: '検索',
      loadMore: 'さらに読み込む',
    },
    state: {
      submitting: '送信中...',
    },
    count: {
      selected: '{count}件選択中',
    },
    aria: {
      close: '閉じる',
      pagination: 'ページ送り',
      firstPage: '最初のページ',
      prevPage: '前のページ',
      nextPage: '次のページ',
      lastPage: '最後のページ',
    },
    error: {
      downloadFailed: 'ダウンロードに失敗しました',
    },
    tag: {
      add: 'タグを追加',
      searchPlaceholder: 'タグ名で検索...',
      searchAria: 'タグを検索',
      searching: 'タグを検索中...',
      empty: '追加できるタグがありません',
    },
  },
  nav: {
    appTitle: '問合せ・ナレッジ管理',
    inquiryList: '問合せ一覧',
    knowledgeSearch: 'ナレッジ検索',
    knowledgeManage: 'ナレッジ管理',
    knowledgeNew: 'ナレッジ作成',
    role: {
      responder: '（回答者）',
      user: '（ユーザー）',
    },
    locale: {
      switchAria: '表示言語を切り替え',
      ja: '日本語',
      en: 'English',
      error: '言語の切り替えに失敗しました',
    },
  },
  inquiry: {
    list: {
      title: '問合せ一覧',
      count: '全 {count} 件',
      new: '新規問合せ',
      empty: '問合せがありません',
      column: {
        title: 'タイトル',
        status: 'ステータス',
        tags: 'タグ',
        author: '作成者',
        createdAt: '作成日時',
      },
      error: {
        fetch: 'データの取得に失敗しました',
        search: '検索に失敗しました',
        sort: 'ソートに失敗しました',
      },
    },
    search: {
      keywordPlaceholder: 'キーワードで検索（タイトル・要約）',
      keywordAria: 'キーワード',
      statusAll: 'ステータス: すべて',
      tagAll: 'タグ: すべて',
      dateLabel: '作成日:',
      dateFromAria: '作成日（開始）',
      dateToAria: '作成日（終了）',
    },
    create: {
      title: '新規問合せ作成',
      desc: '質問内容を入力してください。担当者から回答いたします。',
      titleLabel: 'タイトル',
      titlePlaceholder: '問合せの件名を入力',
      contentLabel: 'お問い合わせ内容',
      contentPlaceholder:
        '質問内容を詳しくご記入ください。\n\n例：\n・発生している問題の内容\n・問題が起きた日時や操作手順\n・エラーメッセージがあればその内容',
      attachLabel: '添付ファイル',
      dropzone: 'ファイルをドラッグ＆ドロップ、またはクリックして選択',
      multipleHint: '複数ファイル添付可能',
      fileCount: '{count} 件のファイルが選択されています',
      submit: '問合せを送信',
      submitting: '送信中...',
      error: '問合せの作成に失敗しました',
    },
    header: {
      meta: '作成者: {author} ｜ 作成日: {date}',
      editTags: 'タグ編集',
      resolve: '解決済みにする',
      cancel: 'キャンセル',
      reopen: '再オープン',
    },
    post: {
      contentAria: '投稿内容',
      attach: 'ファイルを添付',
      fileCount: '{count} 件選択',
      submit: '送信',
      placeholder: '返信を入力...',
      edited: '(編集済)',
      editFormTitle: '投稿を編集',
      updateSubmit: '更新',
      error: {
        add: '投稿の送信に失敗しました',
        update: '投稿の更新に失敗しました',
        delete: '投稿の削除に失敗しました',
        deleteConfirm: 'この投稿を削除しますか？',
      },
    },
    tagEditor: {
      title: 'タグ編集',
    },
    summary: {
      label: '要約',
      detail: '詳細',
    },
    picker: {
      add: '問合せを追加',
      searchPlaceholder: '問合せ名で検索...',
      searchAria: '問合せを検索',
      searching: '問合せを検索中...',
      empty: '該当する問合せがありません',
    },
    error: {
      statusChange: 'ステータス変更に失敗しました',
      reopen: '再オープンに失敗しました',
      updateTags: 'タグの更新に失敗しました',
    },
  },
  knowledge: {
    search: {
      title: '関連ナレッジ',
      placeholder: 'ナレッジを検索...',
      aria: 'ナレッジを検索',
      empty: '該当するナレッジがありません',
      initial: 'キーワードを入力して検索',
      error: '検索に失敗しました',
      page: {
        title: 'ナレッジ検索',
        placeholder: 'ナレッジを検索...',
        empty: '該当するナレッジがありません',
        emptySub: 'キーワードを変えてお試しください',
        searchError: '検索に失敗しました',
      },
    },
    manage: {
      title: 'ナレッジ管理',
      keyword: 'キーワード',
      tagAria: 'タグ',
      tagAll: 'タグ (全て)',
      visibilityAria: '公開範囲',
      visibilityAll: '公開範囲 (全て)',
      selectAll: 'すべて選択',
      selectRow: '{name} を選択',
      merged: '(マージ済)',
      empty: '該当するナレッジがありません',
      prev: '前',
      next: '次',
      error: '一覧の取得に失敗しました',
      column: {
        title: 'タイトル',
        tags: 'タグ',
        visibility: '公開範囲',
        updatedAt: '更新日時',
      },
    },
    detail: {
      visibility: '公開範囲',
      relatedCount: '関連問合せ（{count}件）',
      cta: '解決しない場合は、{link}してください。',
      ctaLink: '問合せを作成',
      author: '作成者: {name}',
      createdDate: '作成日: {date}',
      updatedDate: '最終更新: {date}',
      error: 'ナレッジの取得に失敗しました',
    },
    edit: {
      titleCreate: 'ナレッジ作成',
      titleEdit: 'ナレッジ編集',
      nameLabel: 'タイトル',
      namePlaceholder: 'ナレッジのタイトルを入力',
      contentLabel: 'ナレッジ文',
      contentPlaceholder: 'ナレッジの本文を入力',
      tagsLabel: 'タグ',
      relatedLabel: '関連問合せ',
      visibilityLabel: '公開範囲',
      errorFetch: 'データの取得に失敗しました',
      errorSave: '保存に失敗しました',
      inquiryNameFallback: '(問合せ{oid})',
    },
  },
}
