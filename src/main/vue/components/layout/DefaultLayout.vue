<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div class="d-flex flex-column min-vh-100">
    <nav class="app-navbar">
      <div class="app-navbar__left">
        <router-link class="app-navbar__brand" to="/">
          <div class="app-navbar__brand-icon" aria-hidden="true">
            <AppIcon :name="ICON.brand" size="md" />
          </div>
          {{ t('nav.appTitle') }}
        </router-link>
        <div class="app-navbar__nav">
          <router-link
            class="app-navbar__nav-link"
            to="/inquiry/list"
            :aria-label="t('nav.inquiryList')"
          >
            <AppIcon :name="ICON.inquiryList" size="md" />
            <span class="app-navbar__nav-link-label">{{
              t('nav.inquiryList')
            }}</span>
          </router-link>
          <router-link
            class="app-navbar__nav-link"
            to="/knowledge/search"
            :aria-label="t('nav.knowledgeSearch')"
          >
            <AppIcon :name="ICON.knowledgeSearch" size="md" />
            <span class="app-navbar__nav-link-label">{{
              t('nav.knowledgeSearch')
            }}</span>
          </router-link>
          <router-link
            v-if="isResponder"
            class="app-navbar__nav-link"
            to="/knowledge/manage"
            :aria-label="t('nav.knowledgeManage')"
          >
            <AppIcon :name="ICON.knowledgeManage" size="md" />
            <span class="app-navbar__nav-link-label">{{
              t('nav.knowledgeManage')
            }}</span>
          </router-link>
          <router-link
            v-if="isResponder"
            class="app-navbar__nav-link"
            to="/knowledge/new"
            :aria-label="t('nav.knowledgeNew')"
          >
            <AppIcon :name="ICON.add" size="md" />
            <span class="app-navbar__nav-link-label">{{
              t('nav.knowledgeNew')
            }}</span>
          </router-link>
        </div>
      </div>
      <div class="app-navbar__right">
        <LocaleSwitcher />
        <div v-if="currentUser" class="app-navbar__user">
          <span
            >{{ currentUser.name
            }}<template v-if="isResponder">{{
              t('nav.role.responder')
            }}</template
            ><template v-else>{{ t('nav.role.user') }}</template></span
          >
          <div class="app-navbar__avatar" aria-hidden="true">
            {{ currentUser.name.charAt(0) }}
          </div>
        </div>
      </div>
    </nav>
    <main class="app-container flex-grow-1">
      <router-view />
    </main>
    <!-- グローバル Toast (AI 明示ボタン失敗時の通知用、useToast composable で発火) -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useAuth } from '@/composables/useAuth'
  import Toast from '@/components/ui/Toast.vue'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import LocaleSwitcher from '@/components/layout/LocaleSwitcher.vue'
  import { ICON } from '@/constants/icons'

  const { t } = useI18n()
  const { currentUser, isResponder } = useAuth()
</script>
