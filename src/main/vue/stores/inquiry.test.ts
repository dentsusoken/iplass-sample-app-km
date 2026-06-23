/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInquiryStore } from '@/stores/inquiry'
import type { Inquiry } from '@/types/inquiry'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDel = vi.fn()
const mockRequestByPath = vi.fn()

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({
    api: {
      get: mockGet,
      post: mockPost,
      put: mockPut,
      del: mockDel,
      requestByPath: mockRequestByPath,
    },
  }),
}))

const sampleInquiry: Inquiry = {
  oid: 'inq-001',
  name: 'Test Inquiry',
  summaryShort: 'Summary',
  status: 'Open',
  tags: [{ oid: 'tag-001', tagName: 'General' }],
  closedDate: null,
  createBy: { oid: 'user-001', name: 'User A' },
  createDate: '2026-01-15T10:00:00Z',
  posts: [
    {
      oid: 'post-001',
      content: 'Hello',
      attachments: [],
      createBy: { oid: 'user-001', name: 'User A' },
      createDate: '2026-01-15T10:00:00Z',
      updateDate: '2026-01-15T10:00:00Z',
    },
  ],
}

describe('useInquiryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct defaults', () => {
      const store = useInquiryStore()
      expect(store.currentInquiry).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.list).toEqual([])
      expect(store.totalCount).toBe(0)
      expect(store.searchCondition).toEqual({ offset: 0, limit: 20 })
      expect(store.availableTags).toEqual([])
    })
  })

  describe('getters', () => {
    it('posts returns empty array when no current inquiry', () => {
      const store = useInquiryStore()
      expect(store.posts).toEqual([])
    })

    it('posts returns posts from current inquiry', () => {
      const store = useInquiryStore()
      store.currentInquiry = sampleInquiry
      expect(store.posts).toHaveLength(1)
      expect(store.posts[0].oid).toBe('post-001')
    })

    it('currentPage is 1 at offset 0', () => {
      const store = useInquiryStore()
      expect(store.currentPage).toBe(1)
    })

    it('currentPage calculates correctly for offset 40 with limit 20', () => {
      const store = useInquiryStore()
      store.searchCondition.offset = 40
      expect(store.currentPage).toBe(3)
    })

    it('totalPages calculates correctly', () => {
      const store = useInquiryStore()
      store.totalCount = 45
      expect(store.totalPages).toBe(3) // ceil(45/20)
    })

    it('totalPages is 0 when totalCount is 0', () => {
      const store = useInquiryStore()
      expect(store.totalPages).toBe(0)
    })

    it('isClosed returns false for Open status', () => {
      const store = useInquiryStore()
      store.currentInquiry = { ...sampleInquiry, status: 'Open' }
      expect(store.isClosed).toBe(false)
    })

    it('isClosed returns false for Answered status', () => {
      const store = useInquiryStore()
      store.currentInquiry = { ...sampleInquiry, status: 'Answered' }
      expect(store.isClosed).toBe(false)
    })

    it('isClosed returns true for Resolved status', () => {
      const store = useInquiryStore()
      store.currentInquiry = { ...sampleInquiry, status: 'Resolved' }
      expect(store.isClosed).toBe(true)
    })

    it('isClosed returns true for Canceled status', () => {
      const store = useInquiryStore()
      store.currentInquiry = { ...sampleInquiry, status: 'Canceled' }
      expect(store.isClosed).toBe(true)
    })

    it('isClosed returns false when no current inquiry', () => {
      const store = useInquiryStore()
      expect(store.isClosed).toBe(false)
    })
  })

  describe('fetchList', () => {
    it('should fetch list and update state', async () => {
      mockGet.mockResolvedValueOnce({
        data: [sampleInquiry],
        totalCount: 1,
      })

      const store = useInquiryStore()
      await store.fetchList()

      expect(mockGet).toHaveBeenCalledWith('/inquiry/list', {
        params: { offset: 0, limit: 20 },
      })
      expect(store.list).toHaveLength(1)
      expect(store.totalCount).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('should include statuses array in params when set', async () => {
      mockGet.mockResolvedValueOnce({
        data: [sampleInquiry],
        totalCount: 1,
      })

      const store = useInquiryStore()
      store.setSearchCondition({ statuses: ['Open', 'Answered'] })
      await store.fetchList()

      expect(mockGet).toHaveBeenCalledWith('/inquiry/list', {
        params: expect.objectContaining({
          statuses: ['Open', 'Answered'],
          offset: 0,
          limit: 20,
        }),
      })
    })

    it('should include tagOids array in params when set', async () => {
      mockGet.mockResolvedValueOnce({
        data: [sampleInquiry],
        totalCount: 1,
      })

      const store = useInquiryStore()
      store.setSearchCondition({ tagOids: ['tag-001', 'tag-002'] })
      await store.fetchList()

      expect(mockGet).toHaveBeenCalledWith('/inquiry/list', {
        params: expect.objectContaining({
          tagOids: ['tag-001', 'tag-002'],
          offset: 0,
          limit: 20,
        }),
      })
    })

    it('should not include empty statuses/tagOids in params', async () => {
      mockGet.mockResolvedValueOnce({
        data: [],
        totalCount: 0,
      })

      const store = useInquiryStore()
      store.setSearchCondition({ statuses: [], tagOids: [] })
      await store.fetchList()

      const calledParams = mockGet.mock.calls[0][1].params
      expect(calledParams).not.toHaveProperty('statuses')
      expect(calledParams).not.toHaveProperty('tagOids')
    })

    it('should include sortField and sortOrder in params when set', async () => {
      mockGet.mockResolvedValueOnce({
        data: [],
        totalCount: 0,
      })

      const store = useInquiryStore()
      store.setSearchCondition({ sortField: 'name', sortOrder: 'ASC' })
      await store.fetchList()

      expect(mockGet).toHaveBeenCalledWith('/inquiry/list', {
        params: expect.objectContaining({
          sortField: 'name',
          sortOrder: 'ASC',
        }),
      })
    })

    it('should set isLoading to false even on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

      const store = useInquiryStore()
      await expect(store.fetchList()).rejects.toThrow('Network error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('setSearchCondition', () => {
    it('should merge condition and reset offset to 0', () => {
      const store = useInquiryStore()
      store.searchCondition.offset = 40

      store.setSearchCondition({ statuses: ['Open'], keyword: 'test' })

      expect(store.searchCondition.statuses).toEqual(['Open'])
      expect(store.searchCondition.keyword).toBe('test')
      expect(store.searchCondition.offset).toBe(0)
      expect(store.searchCondition.limit).toBe(20)
    })

    it('should merge sortField and sortOrder', () => {
      const store = useInquiryStore()

      store.setSearchCondition({ sortField: 'name', sortOrder: 'ASC' })

      expect(store.searchCondition.sortField).toBe('name')
      expect(store.searchCondition.sortOrder).toBe('ASC')
    })

    it('should clear sortField and sortOrder when set to undefined', () => {
      const store = useInquiryStore()
      store.setSearchCondition({ sortField: 'name', sortOrder: 'DESC' })

      store.setSearchCondition({ sortField: undefined, sortOrder: undefined })

      expect(store.searchCondition.sortField).toBeUndefined()
      expect(store.searchCondition.sortOrder).toBeUndefined()
    })
  })

  describe('setPage', () => {
    it('should update offset and trigger fetchList', async () => {
      mockGet.mockResolvedValueOnce({ data: [], totalCount: 0 })

      const store = useInquiryStore()
      store.setPage(3)

      expect(store.searchCondition.offset).toBe(40) // (3-1)*20
    })
  })

  describe('fetchAvailableTags', () => {
    it('should fetch and store tags', async () => {
      mockGet.mockResolvedValueOnce({
        data: [
          { oid: 'tag-001', tagName: 'General' },
          { oid: 'tag-002', tagName: 'Technical' },
        ],
      })

      const store = useInquiryStore()
      await store.fetchAvailableTags()

      expect(mockGet).toHaveBeenCalledWith('/tag/list')
      expect(store.availableTags).toHaveLength(2)
    })
  })

  describe('fetchDetail', () => {
    it('should fetch inquiry detail and set currentInquiry', async () => {
      mockGet.mockResolvedValueOnce({ data: sampleInquiry })

      const store = useInquiryStore()
      await store.fetchDetail('inq-001')

      expect(mockGet).toHaveBeenCalledWith('/inquiry/detail/inq-001')
      expect(store.currentInquiry).toEqual(sampleInquiry)
      expect(store.isLoading).toBe(false)
    })

    it('should set isLoading to false even on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Not found'))

      const store = useInquiryStore()
      await expect(store.fetchDetail('inq-999')).rejects.toThrow('Not found')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('createInquiry', () => {
    it('should post FormData and return new oid', async () => {
      mockPost.mockResolvedValueOnce({ data: { oid: 'inq-new' } })

      const store = useInquiryStore()
      const oid = await store.createInquiry('New Inquiry', 'Content', [])

      expect(oid).toBe('inq-new')
      expect(mockPost).toHaveBeenCalledWith(
        '/inquiry/create',
        expect.any(FormData)
      )
    })

    it('should append files to FormData', async () => {
      mockPost.mockResolvedValueOnce({ data: { oid: 'inq-new' } })

      const file = new File(['data'], 'test.txt', { type: 'text/plain' })
      const store = useInquiryStore()
      await store.createInquiry('New', 'Content', [file])

      const formData = mockPost.mock.calls[0][1] as FormData
      expect(formData.get('name')).toBe('New')
      expect(formData.get('content')).toBe('Content')
      expect(formData.get('attachments')).toBeTruthy()
    })
  })

  describe('addPost', () => {
    it('should post content and refetch detail', async () => {
      mockPost.mockResolvedValueOnce({})
      mockGet.mockResolvedValueOnce({ data: sampleInquiry })

      const store = useInquiryStore()
      store.currentInquiry = sampleInquiry

      await store.addPost('New reply', [])

      expect(mockPost).toHaveBeenCalledWith(
        '/inquiry/post/create/inq-001',
        expect.any(FormData)
      )
      expect(mockGet).toHaveBeenCalledWith('/inquiry/detail/inq-001')
    })
  })

  describe('updatePost', () => {
    it('should post updated content and refetch detail', async () => {
      mockPost.mockResolvedValueOnce({})
      mockGet.mockResolvedValueOnce({ data: sampleInquiry })

      const store = useInquiryStore()
      store.currentInquiry = sampleInquiry

      await store.updatePost('post-001', 'Updated content', [])

      expect(mockPost).toHaveBeenCalledWith(
        '/inquiry/post/update/inq-001/post-001',
        expect.any(FormData)
      )
      expect(mockGet).toHaveBeenCalledWith('/inquiry/detail/inq-001')
    })
  })

  describe('deletePost', () => {
    it('should call iPLAss Entity DELETE API via requestByPath and refetch detail', async () => {
      mockRequestByPath.mockResolvedValueOnce({})
      mockGet.mockResolvedValueOnce({ data: sampleInquiry })

      const store = useInquiryStore()
      store.currentInquiry = sampleInquiry

      await store.deletePost('post-001')

      expect(mockRequestByPath).toHaveBeenCalledWith(
        '/api/mtp/entity/km.inquiry.Post/post-001',
        { method: 'DELETE' }
      )
      expect(mockGet).toHaveBeenCalledWith('/inquiry/detail/inq-001')
    })
  })

  describe('closeInquiry', () => {
    it('should post resolved status and refetch detail', async () => {
      mockPost.mockResolvedValueOnce({})
      mockGet.mockResolvedValueOnce({
        data: { ...sampleInquiry, status: 'Resolved' },
      })

      const store = useInquiryStore()
      store.currentInquiry = sampleInquiry

      await store.closeInquiry('resolved')

      expect(mockPost).toHaveBeenCalledWith('/inquiry/close/inq-001', {
        resolution: 'resolved',
      })
    })

    it('should post canceled status and refetch detail', async () => {
      mockPost.mockResolvedValueOnce({})
      mockGet.mockResolvedValueOnce({
        data: { ...sampleInquiry, status: 'Canceled' },
      })

      const store = useInquiryStore()
      store.currentInquiry = sampleInquiry

      await store.closeInquiry('canceled')

      expect(mockPost).toHaveBeenCalledWith('/inquiry/close/inq-001', {
        resolution: 'canceled',
      })
    })
  })

  describe('reopenInquiry', () => {
    it('should post reopen request and refetch detail', async () => {
      mockPost.mockResolvedValueOnce({})
      mockGet.mockResolvedValueOnce({
        data: { ...sampleInquiry, status: 'Open' },
      })

      const store = useInquiryStore()
      store.currentInquiry = { ...sampleInquiry, status: 'Resolved' }

      await store.reopenInquiry()

      expect(mockPost).toHaveBeenCalledWith('/inquiry/reopen/inq-001')
    })
  })

  describe('updateTags', () => {
    it('should put tag oids and refetch detail', async () => {
      mockPut.mockResolvedValueOnce({})
      mockGet.mockResolvedValueOnce({ data: sampleInquiry })

      const store = useInquiryStore()
      store.currentInquiry = sampleInquiry

      await store.updateTags(['tag-001', 'tag-002'])

      expect(mockPut).toHaveBeenCalledWith('/inquiry/tags/update/inq-001', {
        tagOids: ['tag-001', 'tag-002'],
      })
    })
  })
})
