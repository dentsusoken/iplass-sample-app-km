/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */

export class ApiError extends Error {
  constructor(
    public status: number,
    public errorCode: string,
    message: string,
    // iPLAss 標準 API (Entity/Binary 等) がエラー時に返す例外型 (FQCN)。
    // 自作 Command には付かず、メッセージ解決の手掛かりにする。
    public exceptionType?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ApiClient {
  get<T = unknown>(
    path: string,
    options?: { params?: Record<string, unknown> }
  ): Promise<T>
  post<T = unknown>(path: string, body?: unknown): Promise<T>
  put<T = unknown>(path: string, body?: unknown): Promise<T>
  del<T = unknown>(path: string): Promise<T>
  /** baseURL を経由せず、tcPath 相対のパスでリクエストする */
  requestByPath<T = unknown>(path: string, init?: RequestInit): Promise<T>
  /** バイナリファイルをダウンロードする（fetch + Blob 経由） */
  downloadFile(path: string, filename: string): Promise<void>
}

// 配列値を含む params を URLSearchParams に詰める。配列は同名キーで複数 append
// (`?key=a&key=b` 形式)。サーバ側は iPLAss `RequestContext.getParams(name)` で
// `String[]` として受ける。
function buildSearchParams(
  params: Record<string, unknown> | undefined
): URLSearchParams {
  const sp = new URLSearchParams()
  if (!params) return sp
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue
        sp.append(key, String(item))
      }
    } else {
      sp.set(key, String(value))
    }
  }
  return sp
}

function createApiClient(): ApiClient {
  const basePath = window.tcPath || ''
  const baseURL = `${basePath}/api/km`
  const defaultHeaders: HeadersInit = { 'X-Requested-With': 'XMLHttpRequest' }

  async function checkSession(): Promise<boolean> {
    try {
      const res = await fetch(`${basePath}/api/km/session/check`, {
        headers: defaultHeaders,
      })
      return !res.ok
    } catch {
      return true
    }
  }

  async function handleErrorResponse(res: Response): Promise<never> {
    let errorCode = 'UNKNOWN_ERROR'
    let message = `API error: ${res.status}`
    let exceptionType: string | undefined
    try {
      const body = await res.json()
      // 自作 Command は { errorCode, message } で返す。
      if (body.errorCode) errorCode = body.errorCode
      if (body.message) message = body.message
      // iPLAss 標準 API は { exceptionType, exceptionMessage } で返す。
      // message は UI に出さず、開発者向けに exceptionMessage で補完する。
      if (body.exceptionType) {
        exceptionType = body.exceptionType
        if (errorCode === 'UNKNOWN_ERROR' && body.exceptionMessage) {
          message = body.exceptionMessage
        }
      }
    } catch {
      // レスポンスボディが JSON ではない
    }

    if (res.status === 403 && errorCode === 'UNKNOWN_ERROR') {
      const expired = await checkSession()
      if (expired) {
        window.location.reload()
        return new Promise(() => {})
      }
    }

    throw new ApiError(res.status, errorCode, message, exceptionType)
  }

  async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...defaultHeaders,
        ...(init.headers as Record<string, string>),
      },
    })
    if (!res.ok) return handleErrorResponse(res)
    const json = await res.json()
    // iPLAss WebAPI はレスポンスを { status, result } で包む
    return json.result ?? json
  }

  async function downloadFile(path: string, filename: string): Promise<void> {
    const res = await fetch(`${basePath}${path}`, {
      headers: defaultHeaders,
    })
    if (!res.ok) return handleErrorResponse(res)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return {
    get: (path, options) => {
      const sp = buildSearchParams(options?.params)
      const qs = sp.toString()
      const url = qs ? `${baseURL}${path}?${qs}` : `${baseURL}${path}`
      return request(url)
    },
    post: (path, body) => {
      const isFormData = body instanceof FormData
      return request(`${baseURL}${path}`, {
        method: 'POST',
        headers: isFormData ? {} : { 'Content-Type': 'application/json' },
        body: isFormData ? body : JSON.stringify(body ?? {}),
      })
    },
    put: (path, body) => {
      const isFormData = body instanceof FormData
      return request(`${baseURL}${path}`, {
        method: 'PUT',
        headers: isFormData ? {} : { 'Content-Type': 'application/json' },
        body: isFormData ? body : JSON.stringify(body),
      })
    },
    del: (path) => {
      return request(`${baseURL}${path}`, { method: 'DELETE' })
    },
    requestByPath: (path, init = {}) => {
      return request(`${basePath}${path}`, init)
    },
    downloadFile,
  }
}

export function useApi() {
  return { api: createApiClient() }
}
