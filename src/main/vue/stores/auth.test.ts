/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    globalThis.__INITIAL_AUTH__ = {
      user: { oid: 'user-001', name: 'Test User' },
      roles: ['inquiry_responder'],
    }
    setActivePinia(createPinia())
  })

  it('should initialize state from __INITIAL_AUTH__', () => {
    const store = useAuthStore()
    expect(store.user).toEqual({ oid: 'user-001', name: 'Test User' })
    expect(store.roles).toEqual(['inquiry_responder'])
  })

  it('should return isResponder correctly', () => {
    const store = useAuthStore()
    expect(store.isResponder).toBe(true)
  })

  it('should return isResponder false for non-responder', () => {
    globalThis.__INITIAL_AUTH__ = {
      user: { oid: 'user-002', name: 'Normal User' },
      roles: ['inquiry_user'],
    }
    setActivePinia(createPinia())

    const store = useAuthStore()
    expect(store.isResponder).toBe(false)
  })
})
