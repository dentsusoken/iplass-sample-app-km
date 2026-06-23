/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError, useApi } from '@/composables/useApi'

Object.defineProperty(window, 'tcPath', { value: '', writable: true })

describe('ApiError', () => {
  it('should have correct properties', () => {
    const error = new ApiError(404, 'NOT_FOUND', 'Resource not found')
    expect(error.status).toBe(404)
    expect(error.errorCode).toBe('NOT_FOUND')
    expect(error.message).toBe('Resource not found')
    expect(error.name).toBe('ApiError')
    expect(error).toBeInstanceOf(Error)
  })
})

describe('useApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  describe('GET requests', () => {
    it('should make a GET request to the correct URL', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })

      const { api } = useApi()
      const result = await api.get('/inquiry/list')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/km/inquiry/list',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Requested-With': 'XMLHttpRequest',
          }),
        })
      )
      expect(result).toEqual({ data: [] })
    })

    it('should append query params and filter null/undefined values', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })

      const { api } = useApi()
      await api.get('/inquiry/list', {
        params: { status: 'Open', keyword: null, offset: 0 },
      })

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('status=Open')
      expect(calledUrl).toContain('offset=0')
      expect(calledUrl).not.toContain('keyword')
    })
  })

  describe('POST requests', () => {
    it('should send JSON body with Content-Type header', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { oid: 'new-001' } }),
      })

      const { api } = useApi()
      await api.post('/inquiry/create', { name: 'Test' })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/km/inquiry/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ name: 'Test' }),
        })
      )
    })

    it('should send POST request with JSON body for action endpoints', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { api } = useApi()
      await api.post('/inquiry/close/inq-001', { resolution: 'resolved' })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/km/inquiry/close/inq-001',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ resolution: 'resolved' }),
        })
      )
    })

    it('should send empty JSON body when body is omitted', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { api } = useApi()
      await api.post('/inquiry/reopen/inq-001')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/km/inquiry/reopen/inq-001',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({}),
        })
      )
    })

    it('should send FormData without Content-Type header', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { oid: 'new-001' } }),
      })

      const { api } = useApi()
      const formData = new FormData()
      formData.append('name', 'Test')
      await api.post('/inquiry/create', formData)

      const callArgs = fetchMock.mock.calls[0]
      expect(callArgs[1].body).toBe(formData)
      // FormData では Content-Type を設定しない (ブラウザが boundary 付きで設定する)
      expect(callArgs[1].headers['Content-Type']).toBeUndefined()
    })
  })

  describe('PUT requests', () => {
    it('should send PUT request with JSON body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { api } = useApi()
      await api.put('/inquiry/tags/update/inq-001', {
        tagOids: ['tag-001', 'tag-002'],
      })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/km/inquiry/tags/update/inq-001',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ tagOids: ['tag-001', 'tag-002'] }),
        })
      )
    })
  })

  describe('DELETE requests', () => {
    it('should send DELETE request', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { api } = useApi()
      await api.del('/inquiry/post/delete/inq-001/post-001')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/km/inquiry/post/delete/inq-001/post-001',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('requestByPath', () => {
    it('should use tcPath-relative URL instead of baseURL', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { api } = useApi()
      await api.requestByPath('/api/entity/km.inquiry.Post/post-001', {
        method: 'DELETE',
      })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/entity/km.inquiry.Post/post-001',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'X-Requested-With': 'XMLHttpRequest',
          }),
        })
      )
    })
  })

  describe('session expiry detection', () => {
    it('should reload when 403 without errorCode and session check also returns 403', async () => {
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { ...window.location, reload: reloadMock },
        writable: true,
      })

      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: () =>
            Promise.resolve({
              exceptionType: 'org.iplass.mtp.auth.NoPermissionException',
            }),
        })
        .mockResolvedValueOnce({ ok: false, status: 403 })

      const { api } = useApi()
      const result = await Promise.race([
        api
          .get('/test')
          .then(() => 'resolved')
          .catch(() => 'rejected'),
        new Promise((r) => setTimeout(() => r('pending'), 50)),
      ])

      expect(result).toBe('pending')
      expect(reloadMock).toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('should throw ApiError when 403 without errorCode but session is valid', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: () =>
            Promise.resolve({
              exceptionType: 'org.iplass.mtp.auth.NoPermissionException',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'SUCCESS' }),
        })

      const { api } = useApi()

      try {
        await api.get('/test')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        const err = e as ApiError
        expect(err.status).toBe(403)
        expect(err.errorCode).toBe('UNKNOWN_ERROR')
      }
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('should not trigger session check when 403 has app-level errorCode', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            errorCode: 'FORBIDDEN_NOT_RESPONDER',
            message: 'Only responders can edit tags',
          }),
      })

      const { api } = useApi()

      try {
        await api.get('/test')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        const err = e as ApiError
        expect(err.errorCode).toBe('FORBIDDEN_NOT_RESPONDER')
      }
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('should not trigger session check for non-403 errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not JSON')),
      })

      const { api } = useApi()

      try {
        await api.get('/test')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        const err = e as ApiError
        expect(err.status).toBe(500)
      }
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    it('should throw ApiError with errorCode from response body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            errorCode: 'VALIDATION_ERROR',
            message: 'Invalid input',
          }),
      })

      const { api } = useApi()

      try {
        await api.get('/inquiry/list')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        const err = e as ApiError
        expect(err.status).toBe(400)
        expect(err.errorCode).toBe('VALIDATION_ERROR')
        expect(err.message).toBe('Invalid input')
      }
    })

    it('should throw ApiError with UNKNOWN_ERROR when response body is not JSON', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not JSON')),
      })

      const { api } = useApi()

      try {
        await api.get('/test')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        const err = e as ApiError
        expect(err.status).toBe(500)
        expect(err.errorCode).toBe('UNKNOWN_ERROR')
      }
    })

    it('should expose exceptionType from iPLAss standard API error body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            exceptionType: 'org.iplass.mtp.entity.EntityRuntimeException',
            exceptionMessage: 'entity failed',
          }),
      })

      const { api } = useApi()

      try {
        await api.get('/test')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        const err = e as ApiError
        expect(err.status).toBe(500)
        expect(err.errorCode).toBe('UNKNOWN_ERROR')
        expect(err.exceptionType).toBe(
          'org.iplass.mtp.entity.EntityRuntimeException'
        )
        // errorCode 不在時は message を exceptionMessage で補完する
        expect(err.message).toBe('entity failed')
      }
    })
  })

  describe('downloadFile', () => {
    let createObjectURLMock: ReturnType<typeof vi.fn>
    let revokeObjectURLMock: ReturnType<typeof vi.fn>
    let clickMock: ReturnType<typeof vi.fn>
    let mockAnchor: {
      href: string
      download: string
      click: ReturnType<typeof vi.fn>
    }

    beforeEach(() => {
      createObjectURLMock = vi.fn(() => 'blob:mock-url')
      revokeObjectURLMock = vi.fn()
      vi.stubGlobal('URL', {
        ...globalThis.URL,
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      })

      clickMock = vi.fn()
      mockAnchor = { href: '', download: '', click: clickMock }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockAnchor as unknown as HTMLElement
      )
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)
    })

    it('should fetch with correct URL and X-Requested-With header', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'])),
      })

      const { api } = useApi()
      await api.downloadFile('/api/mtp/bin/123', 'report.pdf')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/mtp/bin/123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Requested-With': 'XMLHttpRequest',
          }),
        })
      )
    })

    it('should create blob URL and trigger programmatic download', async () => {
      const blob = new Blob(['test-content'])
      fetchMock.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(blob),
      })

      const { api } = useApi()
      await api.downloadFile('/api/mtp/bin/123', 'report.pdf')

      expect(createObjectURLMock).toHaveBeenCalledWith(blob)
      expect(mockAnchor.href).toBe('blob:mock-url')
      expect(mockAnchor.download).toBe('report.pdf')
      expect(clickMock).toHaveBeenCalled()
      expect(document.body.appendChild).toHaveBeenCalled()
      expect(document.body.removeChild).toHaveBeenCalled()
    })

    it('should revoke object URL after timeout', async () => {
      vi.useFakeTimers()
      fetchMock.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'])),
      })

      const { api } = useApi()
      await api.downloadFile('/api/mtp/bin/123', 'file.txt')

      expect(revokeObjectURLMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(60_000)
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
      vi.useRealTimers()
    })

    it('should throw ApiError on 404', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            errorCode: 'NOT_FOUND',
            message: 'File not found',
          }),
      })

      const { api } = useApi()

      try {
        await api.downloadFile('/api/mtp/bin/999', 'missing.pdf')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        const err = e as ApiError
        expect(err.status).toBe(404)
        expect(err.errorCode).toBe('NOT_FOUND')
      }
    })

    it('should reload on 403 session expiry', async () => {
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { ...window.location, reload: reloadMock },
        writable: true,
      })

      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: () =>
            Promise.resolve({
              exceptionType: 'org.iplass.mtp.auth.NoPermissionException',
            }),
        })
        .mockResolvedValueOnce({ ok: false, status: 403 })

      const { api } = useApi()
      const result = await Promise.race([
        api
          .downloadFile('/api/mtp/bin/123', 'file.txt')
          .then(() => 'resolved')
          .catch(() => 'rejected'),
        new Promise((r) => setTimeout(() => r('pending'), 50)),
      ])

      expect(result).toBe('pending')
      expect(reloadMock).toHaveBeenCalled()
    })

    it('should throw ApiError on 403 when session is valid', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: () =>
            Promise.resolve({
              exceptionType: 'org.iplass.mtp.auth.NoPermissionException',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'SUCCESS' }),
        })

      const { api } = useApi()

      try {
        await api.downloadFile('/api/mtp/bin/123', 'file.txt')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        const err = e as ApiError
        expect(err.status).toBe(403)
        expect(err.errorCode).toBe('UNKNOWN_ERROR')
      }
    })
  })
})
