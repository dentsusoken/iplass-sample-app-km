/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'

export function useAuth() {
  const store = useAuthStore()
  const isResponder = computed(() => store.isResponder)
  const currentUser = computed(() => store.user)
  return { isResponder, currentUser }
}
