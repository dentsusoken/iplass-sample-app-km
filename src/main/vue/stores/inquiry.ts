/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import type {
  Inquiry,
  Post,
  InquirySearchCondition,
  Tag,
} from '@/types/inquiry'

interface InquiryState {
  currentInquiry: Inquiry | null
  isLoading: boolean
  list: Inquiry[]
  totalCount: number
  searchCondition: InquirySearchCondition
  availableTags: Tag[]
}

const DEFAULT_LIMIT = 20

export const useInquiryStore = defineStore('inquiry', {
  state: (): InquiryState => ({
    currentInquiry: null,
    isLoading: false,
    list: [],
    totalCount: 0,
    searchCondition: { offset: 0, limit: DEFAULT_LIMIT },
    availableTags: [],
  }),
  getters: {
    posts: (state): Post[] => state.currentInquiry?.posts ?? [],
    currentPage: (state): number =>
      Math.floor(state.searchCondition.offset / state.searchCondition.limit) +
      1,
    totalPages: (state): number =>
      Math.ceil(state.totalCount / state.searchCondition.limit),
    isClosed: (state): boolean =>
      state.currentInquiry?.status === 'Resolved' ||
      state.currentInquiry?.status === 'Canceled',
  },
  actions: {
    async fetchList() {
      this.isLoading = true
      try {
        const { api } = useApi()
        const { statuses, tagOids, ...rest } = this.searchCondition
        const params: Record<string, unknown> = { ...rest }
        // 配列パラメータは配列のまま渡す。useApi 側で同名キー複数展開
        // (?statuses=a&statuses=b) に変換され、サーバは iPLAss の
        // RequestContext.getParams(name) で String[] として受け取る。
        if (statuses?.length) params.statuses = statuses
        if (tagOids?.length) params.tagOids = tagOids
        const res = await api.get<{
          data: Inquiry[]
          totalCount: number
        }>('/inquiry/list', { params })
        this.list = res.data
        this.totalCount = res.totalCount
      } finally {
        this.isLoading = false
      }
    },
    setSearchCondition(condition: Partial<InquirySearchCondition>) {
      this.searchCondition = {
        ...this.searchCondition,
        ...condition,
        offset: 0,
      }
    },
    setPage(page: number) {
      this.searchCondition.offset = (page - 1) * this.searchCondition.limit
      this.fetchList()
    },
    async fetchAvailableTags() {
      const { api } = useApi()
      const res = await api.get<{ data: Tag[] }>('/tag/list')
      this.availableTags = res.data
    },
    async fetchDetail(oid: string) {
      this.isLoading = true
      try {
        const { api } = useApi()
        const res = await api.get<{ data: Inquiry }>(`/inquiry/detail/${oid}`)
        this.currentInquiry = res.data
      } finally {
        this.isLoading = false
      }
    },
    async createInquiry(name: string, content: string, files: File[]) {
      const { api } = useApi()
      const formData = new FormData()
      formData.append('name', name)
      formData.append('content', content)
      files.forEach((f) => formData.append('attachments', f))
      const res = await api.post<{ data: { oid: string } }>(
        '/inquiry/create',
        formData
      )
      return res.data.oid
    },
    async addPost(content: string, files: File[]) {
      const oid = this.currentInquiry!.oid
      const { api } = useApi()
      const formData = new FormData()
      formData.append('content', content)
      files.forEach((f) => formData.append('attachments', f))
      await api.post(`/inquiry/post/create/${oid}`, formData)
      await this.fetchDetail(oid)
    },
    async updatePost(postOid: string, content: string, files: File[]) {
      const oid = this.currentInquiry!.oid
      const { api } = useApi()
      const formData = new FormData()
      formData.append('content', content)
      files.forEach((f) => formData.append('attachments', f))
      await api.post(`/inquiry/post/update/${oid}/${postOid}`, formData)
      await this.fetchDetail(oid)
    },
    async deletePost(postOid: string) {
      const oid = this.currentInquiry!.oid
      const { api } = useApi()
      // 投稿削除はiPLAss標準Entity APIを使用（Entity権限で制御するため専用APIは不要）
      await api.requestByPath(`/api/mtp/entity/km.inquiry.Post/${postOid}`, {
        method: 'DELETE',
      })
      await this.fetchDetail(oid)
    },
    async closeInquiry(resolution: 'resolved' | 'canceled') {
      const oid = this.currentInquiry!.oid
      const { api } = useApi()
      await api.post(`/inquiry/close/${oid}`, { resolution })
      await this.fetchDetail(oid)
    },
    async reopenInquiry() {
      const oid = this.currentInquiry!.oid
      const { api } = useApi()
      await api.post(`/inquiry/reopen/${oid}`)
      await this.fetchDetail(oid)
    },
    async updateTags(tagOids: string[]) {
      const oid = this.currentInquiry!.oid
      const { api } = useApi()
      await api.put(`/inquiry/tags/update/${oid}`, { tagOids })
      await this.fetchDetail(oid)
    },
  },
})
