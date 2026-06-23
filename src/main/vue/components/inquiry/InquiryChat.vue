<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div>
    <!-- 新規問合せモード -->
    <template v-if="isNewMode">
      <div class="create-form">
        <div class="create-form__header">
          <h1 class="create-form__title">{{ t('inquiry.create.title') }}</h1>
          <p class="create-form__desc">
            {{ t('inquiry.create.desc') }}
          </p>
        </div>

        <div class="app-card">
          <div
            class="app-card__body"
            style="display: flex; flex-direction: column; gap: var(--space-md)"
          >
            <div>
              <label class="form-label"
                >{{ t('inquiry.create.titleLabel') }}
                <span class="form-required">*</span></label
              >
              <input
                v-model="newTitle"
                type="text"
                class="form-control"
                :placeholder="t('inquiry.create.titlePlaceholder')"
              />
            </div>

            <div>
              <label class="form-label"
                >{{ t('inquiry.create.contentLabel') }}
                <span class="form-required">*</span></label
              >
              <textarea
                v-model="newContent"
                class="form-control"
                rows="8"
                :placeholder="t('inquiry.create.contentPlaceholder')"
              ></textarea>
            </div>

            <div>
              <label class="form-label">{{
                t('inquiry.create.attachLabel')
              }}</label>
              <div
                class="file-upload"
                @click="($refs.fileInput as HTMLInputElement).click()"
                @dragover.prevent
                @drop.prevent="onDropFiles"
              >
                <AppIcon
                  :name="ICON.upload"
                  size="2xl"
                  class="file-upload__icon"
                />
                <div>{{ t('inquiry.create.dropzone') }}</div>
                <div
                  style="
                    font-size: var(--font-size-xs);
                    margin-top: var(--space-xs);
                  "
                >
                  {{ t('inquiry.create.multipleHint') }}
                </div>
              </div>
              <input
                ref="fileInput"
                type="file"
                multiple
                style="display: none"
                @change="onFileChange"
              />
              <div
                v-if="newFiles.length > 0"
                style="
                  margin-top: var(--space-sm);
                  font-size: var(--font-size-xs);
                  color: var(--color-on-surface-variant);
                "
              >
                {{ t('inquiry.create.fileCount', { count: newFiles.length }) }}
              </div>
            </div>

            <div v-if="errorMessage" class="alert alert-danger" role="alert">
              {{ errorMessage }}
            </div>

            <div class="form-actions">
              <router-link :to="{ name: 'inquiryList' }" class="btn-app-ghost">
                {{ t('common.action.cancel') }}
              </router-link>
              <button
                class="btn-app-primary btn-app-primary-lg"
                :disabled="!newTitle.trim() || !newContent.trim() || creating"
                @click="onCreate"
              >
                <AppIcon :name="ICON.send" size="lg" />
                {{
                  creating
                    ? t('inquiry.create.submitting')
                    : t('inquiry.create.submit')
                }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 既存問合せモード -->
    <template v-else>
      <div v-if="store.isLoading" class="empty-state">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <template v-else-if="store.currentInquiry">
        <div class="chat-layout">
          <div class="chat-main">
            <InquiryHeader
              :inquiry="store.currentInquiry"
              @close="onClose"
              @reopen="onReopen"
              @edit-tags="showTagEditor = true"
            />

            <!-- 要約カード (responder のみ・summaryShort 非空のとき表示) -->
            <InquirySummaryCard
              :summary-short="store.currentInquiry.summaryShort"
              :summary-detail="store.currentInquiry.summaryDetail"
            />

            <div
              v-if="errorMessage"
              class="alert alert-danger alert-dismissible"
              role="alert"
              style="margin-bottom: var(--space-md)"
            >
              {{ errorMessage }}
              <button
                type="button"
                class="btn-close"
                :aria-label="t('common.aria.close')"
                @click="errorMessage = ''"
              ></button>
            </div>

            <div class="post-list">
              <PostItem
                v-for="post in store.posts"
                :key="post.oid"
                :post="post"
                :is-closed="store.isClosed"
                :inquiry-creator-oid="store.currentInquiry.createBy.oid"
                @edit="onEditPost"
                @delete="onDeletePost"
              />
            </div>

            <!-- 投稿のインライン編集 -->
            <div
              v-if="editingPost"
              class="app-card"
              style="
                margin-bottom: var(--space-md);
                border-left: 3px solid var(--color-warning);
              "
            >
              <div class="app-card__header">
                <span style="font-weight: 600">{{
                  t('inquiry.post.editFormTitle')
                }}</span>
                <button
                  type="button"
                  class="btn-close"
                  :aria-label="t('common.aria.close')"
                  @click="editingPost = null"
                ></button>
              </div>
              <div class="app-card__body">
                <PostForm
                  :submit-label="t('inquiry.post.updateSubmit')"
                  :initial-content="editingPost.content"
                  :submit-handler="onUpdatePost"
                />
              </div>
            </div>

            <!-- 投稿フォーム (クローズ時は非表示) -->
            <PostForm v-if="!store.isClosed" :submit-handler="onAddPost" />
          </div>

          <InquirySidePanel ref="knowledgeSearchRef" :inquiry-oid="props.id" />
        </div>

        <!-- タグ編集モーダル -->
        <div
          v-if="showTagEditor"
          class="modal d-block"
          tabindex="-1"
          style="background: rgba(0, 0, 0, 0.5)"
        >
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">{{ t('inquiry.tagEditor.title') }}</h5>
                <button
                  type="button"
                  class="btn-close"
                  :aria-label="t('common.aria.close')"
                  @click="showTagEditor = false"
                ></button>
              </div>
              <div class="modal-body">
                <div
                  v-for="tag in store.availableTags"
                  :key="tag.oid"
                  class="form-check"
                >
                  <input
                    :id="`tag-${tag.oid}`"
                    v-model="selectedTagOids"
                    class="form-check-input"
                    type="checkbox"
                    :value="tag.oid"
                  />
                  <label class="form-check-label" :for="`tag-${tag.oid}`">
                    {{ tag.tagName }}
                  </label>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn-app-ghost" @click="showTagEditor = false">
                  {{ t('common.action.cancel') }}
                </button>
                <button class="btn-app-primary" @click="onUpdateTags">
                  {{ t('common.action.save') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRoute, useRouter } from 'vue-router'
  import { useInquiryStore } from '@/stores/inquiry'
  import { toUserMessage } from '@/composables/errors'
  import { filesFromInputEvent, filesFromDropEvent } from '@/utils/files'
  import type { Post } from '@/types/inquiry'
  import InquiryHeader from './InquiryHeader.vue'
  import InquirySummaryCard from './InquirySummaryCard.vue'
  import PostItem from './PostItem.vue'
  import PostForm from './PostForm.vue'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import InquirySidePanel from '@/components/inquiry/InquirySidePanel.vue'

  const props = defineProps<{
    id?: string
  }>()

  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const store = useInquiryStore()

  const isNewMode = computed(() => route.name === 'inquiryNew')
  const newTitle = ref('')
  const newContent = ref('')
  const newFiles = ref<File[]>([])
  const editingPost = ref<Post | null>(null)
  const showTagEditor = ref(false)
  const selectedTagOids = ref<string[]>([])
  const errorMessage = ref('')
  const creating = ref(false)
  // サイドパネル実装によっては fetchSuggestions を持たないため optional chain で吸収する。
  const knowledgeSearchRef = ref<{
    fetchSuggestions?: () => void
  } | null>(null)
  let suggestTimer: ReturnType<typeof setTimeout> | null = null

  async function loadDetail(id: string) {
    await Promise.all([store.fetchDetail(id), store.fetchAvailableTags()])
    syncSelectedTags()
  }

  onMounted(async () => {
    if (!isNewMode.value && props.id) {
      await loadDetail(props.id)
    } else {
      await store.fetchAvailableTags()
    }
  })

  // ルート再利用への対応: inquiryNew → inquiryChat や、異なる問合せ間の遷移
  watch(
    () => props.id,
    async (newId) => {
      if (newId) {
        await loadDetail(newId)
      }
    }
  )

  watch(
    () => store.currentInquiry?.tags,
    () => syncSelectedTags()
  )

  function syncSelectedTags() {
    selectedTagOids.value = store.currentInquiry?.tags.map((t) => t.oid) ?? []
  }

  function onFileChange(e: Event) {
    newFiles.value = filesFromInputEvent(e)
  }

  function onDropFiles(e: DragEvent) {
    newFiles.value = filesFromDropEvent(e)
  }

  async function onCreate() {
    if (!newTitle.value.trim() || !newContent.value.trim() || creating.value)
      return
    creating.value = true
    errorMessage.value = ''
    try {
      const oid = await store.createInquiry(
        newTitle.value,
        newContent.value,
        newFiles.value
      )
      router.push({ name: 'inquiryChat', params: { id: oid } })
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('inquiry.create.error'))
    } finally {
      creating.value = false
    }
  }

  async function onAddPost(payload: { content: string; files: File[] }) {
    errorMessage.value = ''
    try {
      await store.addPost(payload.content, payload.files)
      triggerSuggestions()
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('inquiry.post.error.add'))
      throw e
    }
  }

  function triggerSuggestions() {
    if (suggestTimer) clearTimeout(suggestTimer)
    suggestTimer = setTimeout(() => {
      knowledgeSearchRef.value?.fetchSuggestions?.()
      suggestTimer = null
    }, 300)
  }

  onBeforeUnmount(() => {
    if (suggestTimer) clearTimeout(suggestTimer)
  })

  function onEditPost(post: Post) {
    editingPost.value = post
  }

  async function onUpdatePost(payload: { content: string; files: File[] }) {
    if (!editingPost.value) return
    errorMessage.value = ''
    try {
      await store.updatePost(
        editingPost.value.oid,
        payload.content,
        payload.files
      )
      editingPost.value = null
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('inquiry.post.error.update'))
      throw e
    }
  }

  async function onDeletePost(post: Post) {
    if (!confirm(t('inquiry.post.error.deleteConfirm'))) return
    errorMessage.value = ''
    try {
      await store.deletePost(post.oid)
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('inquiry.post.error.delete'))
    }
  }

  async function onClose(resolution: 'resolved' | 'canceled') {
    errorMessage.value = ''
    try {
      await store.closeInquiry(resolution)
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('inquiry.error.statusChange'))
    }
  }

  async function onReopen() {
    errorMessage.value = ''
    try {
      await store.reopenInquiry()
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('inquiry.error.reopen'))
    }
  }

  async function onUpdateTags() {
    errorMessage.value = ''
    try {
      await store.updateTags(selectedTagOids.value)
      showTagEditor.value = false
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('inquiry.error.updateTags'))
    }
  }
</script>
