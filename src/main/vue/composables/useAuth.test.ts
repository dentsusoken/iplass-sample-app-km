/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'

describe('useAuth', () => {
  beforeEach(() => {
    globalThis.__INITIAL_AUTH__ = {
      user: { oid: 'user-001', name: 'Test User' },
      roles: ['inquiry_responder'],
    }
    setActivePinia(createPinia())
  })

  it('should return isResponder from store', () => {
    const { isResponder } = useAuth()
    expect(isResponder.value).toBe(true)
  })

  it('should return currentUser from store', () => {
    const { currentUser } = useAuth()
    expect(currentUser.value).toEqual({ oid: 'user-001', name: 'Test User' })
  })

  it('isResponder should be reactive to store changes', () => {
    const { isResponder } = useAuth()
    expect(isResponder.value).toBe(true)

    const store = useAuthStore()
    store.roles = ['inquiry_user']
    expect(isResponder.value).toBe(false)
  })

  it('currentUser should be reactive to store changes', () => {
    const { currentUser } = useAuth()
    expect(currentUser.value).toEqual({ oid: 'user-001', name: 'Test User' })

    const store = useAuthStore()
    store.user = { oid: 'user-002', name: 'New User' }
    expect(currentUser.value).toEqual({ oid: 'user-002', name: 'New User' })
  })
})
