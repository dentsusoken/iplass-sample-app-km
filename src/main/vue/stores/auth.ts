/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { defineStore } from 'pinia'
import type { UserRef } from '@/types/inquiry'

interface AuthState {
  user: UserRef | null
  roles: string[]
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: __INITIAL_AUTH__.user,
    roles: __INITIAL_AUTH__.roles,
  }),
  getters: {
    isResponder: (state) => state.roles.includes('inquiry_responder'),
  },
})
