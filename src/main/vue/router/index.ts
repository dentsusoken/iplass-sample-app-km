/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { createRouter as _createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import KnowledgeSearchPage from '@/components/knowledge/KnowledgeSearchPage.vue'
import KnowledgeManageList from '@/components/knowledge/KnowledgeManageList.vue'
import featureRoutes from './featureRoutes'

const coreRoutes: RouteRecordRaw[] = [
  {
    path: '',
    redirect: '/inquiry/list',
  },
  {
    path: 'inquiry/list',
    name: 'inquiryList',
    component: () => import('@/components/inquiry/InquiryList.vue'),
  },
  {
    path: 'inquiry/new',
    name: 'inquiryNew',
    component: () => import('@/components/inquiry/InquiryChat.vue'),
  },
  {
    path: 'inquiry/:id',
    name: 'inquiryChat',
    component: () => import('@/components/inquiry/InquiryChat.vue'),
    props: true,
  },
  {
    path: 'knowledge/search',
    name: 'knowledgeSearch',
    component: KnowledgeSearchPage,
  },
  {
    // ナレッジ管理一覧 (responder 向け)
    path: 'knowledge/manage',
    name: 'knowledgeManage',
    component: KnowledgeManageList,
  },
  {
    path: 'knowledge/new',
    name: 'knowledgeNew',
    component: () => import('@/components/knowledge/KnowledgeEdit.vue'),
  },
  {
    path: 'knowledge/edit/:id',
    name: 'knowledgeEdit',
    component: () => import('@/components/knowledge/KnowledgeEdit.vue'),
    props: true,
  },
  {
    path: 'knowledge/:id',
    name: 'knowledgeDetail',
    component: () => import('@/components/knowledge/KnowledgeDetail.vue'),
    props: true,
  },
]

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [...coreRoutes, ...featureRoutes],
  },
]

export function createRouter() {
  return _createRouter({
    history: createWebHashHistory(),
    routes,
  })
}
