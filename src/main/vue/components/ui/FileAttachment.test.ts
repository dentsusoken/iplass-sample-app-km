/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FileAttachment from '@/components/ui/FileAttachment.vue'
import { ApiError } from '@/composables/useApi'

const mockDownloadFile = vi.fn()

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      del: vi.fn(),
      requestByPath: vi.fn(),
      downloadFile: mockDownloadFile,
    },
  }),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public errorCode: string,
      message: string
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

const attachment = {
  name: 'report.pdf',
  lobId: 'lob-123',
  type: 'application/pdf',
}

describe('FileAttachment', () => {
  beforeEach(() => {
    mockDownloadFile.mockReset()
  })

  it('should render attachment name', () => {
    const wrapper = mount(FileAttachment, { props: { attachment } })
    expect(wrapper.text()).toContain('report.pdf')
  })

  it('should call api.downloadFile with correct path and filename on click', async () => {
    mockDownloadFile.mockResolvedValueOnce(undefined)
    const wrapper = mount(FileAttachment, { props: { attachment } })

    await wrapper.find('a').trigger('click')
    await vi.dynamicImportSettled()

    expect(mockDownloadFile).toHaveBeenCalledWith(
      '/api/mtp/bin/lob-123',
      'report.pdf'
    )
  })

  it('should use href="#" to prevent default navigation', () => {
    const wrapper = mount(FileAttachment, { props: { attachment } })
    expect(wrapper.find('a').attributes('href')).toBe('#')
  })

  it('should prevent double-click during download', async () => {
    let resolveDownload: () => void
    mockDownloadFile.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveDownload = resolve
      })
    )

    const wrapper = mount(FileAttachment, { props: { attachment } })
    const link = wrapper.find('a')

    await link.trigger('click')
    await link.trigger('click')

    expect(mockDownloadFile).toHaveBeenCalledTimes(1)

    resolveDownload!()
  })

  it('should show error message on download failure', async () => {
    mockDownloadFile.mockRejectedValueOnce(
      new ApiError(500, 'UNKNOWN_ERROR', 'Server error')
    )

    const wrapper = mount(FileAttachment, { props: { attachment } })
    await wrapper.find('a').trigger('click')
    await vi.dynamicImportSettled()

    expect(wrapper.text()).toContain('ダウンロードに失敗しました')
  })

  it('should clear error on successful retry', async () => {
    mockDownloadFile.mockRejectedValueOnce(
      new ApiError(500, 'UNKNOWN_ERROR', 'Server error')
    )

    const wrapper = mount(FileAttachment, { props: { attachment } })
    await wrapper.find('a').trigger('click')
    await vi.dynamicImportSettled()
    expect(wrapper.text()).toContain('ダウンロードに失敗しました')

    mockDownloadFile.mockResolvedValueOnce(undefined)
    await wrapper.find('a').trigger('click')
    await vi.dynamicImportSettled()

    expect(wrapper.text()).not.toContain('ダウンロードに失敗しました')
  })
})
