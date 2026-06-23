<!-- Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. -->
<template>
  <div>
    <div v-if="loading" class="empty-state">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <template v-else>
      <div class="create-form">
        <div class="create-form__header">
          <h1 class="create-form__title">
            {{
              isEditMode
                ? t('knowledge.edit.titleEdit')
                : t('knowledge.edit.titleCreate')
            }}
          </h1>
        </div>

        <div class="app-card">
          <div
            class="app-card__body"
            style="display: flex; flex-direction: column; gap: var(--space-md)"
          >
            <div>
              <label for="knowledge-name" class="form-label"
                >{{ t('knowledge.edit.nameLabel') }}
                <span class="form-required">*</span></label
              >
              <input
                id="knowledge-name"
                v-model="form.name"
                type="text"
                class="form-control"
                :placeholder="t('knowledge.edit.namePlaceholder')"
                aria-required="true"
              />
            </div>

            <div>
              <label for="knowledge-content" class="form-label"
                >{{ t('knowledge.edit.contentLabel') }}
                <span class="form-required">*</span></label
              >
              <textarea
                id="knowledge-content"
                v-model="form.content"
                class="form-control"
                rows="10"
                :placeholder="t('knowledge.edit.contentPlaceholder')"
                aria-required="true"
              ></textarea>
            </div>

            <div>
              <label class="form-label">{{
                t('knowledge.edit.tagsLabel')
              }}</label>
              <TagChipPicker v-model="form.tags" />
            </div>

            <div>
              <label class="form-label">{{
                t('knowledge.edit.relatedLabel')
              }}</label>
              <InquiryPicker v-model="form.relatedInquiries" />
            </div>

            <div>
              <label id="visibility-label" class="form-label">{{
                t('knowledge.edit.visibilityLabel')
              }}</label>
              <div
                class="radio-list"
                role="radiogroup"
                aria-labelledby="visibility-label"
              >
                <label class="radio-item">
                  <input
                    v-model="form.visibility"
                    type="radio"
                    value="internal"
                  />
                  {{ t('visibility.internal') }}
                </label>
                <label class="radio-item">
                  <input
                    v-model="form.visibility"
                    type="radio"
                    value="public"
                  />
                  {{ t('visibility.public') }}
                </label>
              </div>
            </div>

            <div v-if="errorMessage" class="alert alert-danger" role="alert">
              {{ errorMessage }}
            </div>

            <div class="form-actions">
              <button type="button" class="btn-app-ghost" @click="onCancel">
                {{ t('common.action.cancel') }}
              </button>
              <button
                class="btn-app-primary btn-app-primary-lg"
                :disabled="!canSubmit || submitting"
                @click="onSubmit"
              >
                <AppIcon :name="ICON.save" size="lg" />
                {{
                  submitting
                    ? t('common.state.submitting')
                    : t('common.action.save')
                }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { useApi } from '@/composables/useApi'
  import { toUserMessage } from '@/composables/errors'
  import { useKnowledgeDraft } from '@/composables/useKnowledgeDraft'
  import TagChipPicker from '@/components/ui/TagChipPicker.vue'
  import InquiryPicker from '@/components/inquiry/InquiryPicker.vue'
  import AppIcon from '@/components/ui/AppIcon.vue'
  import { ICON } from '@/constants/icons'
  import type { Tag, InquiryRef } from '@/types/inquiry'
  import type { KnowledgeEditNavState, Visibility } from '@/types/knowledge'

  const props = defineProps<{
    id?: string
  }>()

  const { t } = useI18n()
  const router = useRouter()
  const { api } = useApi()
  const { applyGeneratedDraft } = useKnowledgeDraft()

  const isEditMode = computed(() => !!props.id)

  const form = reactive({
    name: '',
    content: '',
    tags: [] as Tag[],
    relatedInquiries: [] as InquiryRef[],
    visibility: 'internal' as Visibility,
  })

  const loading = ref(false)
  const submitting = ref(false)
  const errorMessage = ref('')

  const canSubmit = computed(
    () => form.name.trim() !== '' && form.content.trim() !== ''
  )

  async function loadDetail() {
    if (!props.id) return
    loading.value = true
    try {
      const res = await api.get<{
        data: {
          name: string
          content: string
          tags?: { oid: string; tagName: string }[]
          relatedInquiries?: { oid: string; name: string }[]
          visibility?: Visibility
        }
      }>(`/knowledge/detail/${props.id}`)
      const d = res.data
      form.name = d.name
      form.content = d.content
      form.tags = (d.tags ?? []).map((t) => ({
        oid: t.oid,
        tagName: t.tagName,
      }))
      form.relatedInquiries = (d.relatedInquiries ?? []).map((r) => ({
        oid: r.oid,
        name: r.name,
      }))
      form.visibility = d.visibility ?? 'internal'
    } catch (e) {
      errorMessage.value = toUserMessage(e, t('knowledge.edit.errorFetch'))
    } finally {
      loading.value = false
    }
  }

  function onCancel() {
    router.back()
  }

  async function onSubmit() {
    if (!canSubmit.value || submitting.value) return
    submitting.value = true
    errorMessage.value = ''

    const body = {
      name: form.name,
      content: form.content,
      tagOids: form.tags.map((t) => t.oid),
      relatedInquiryOids: form.relatedInquiries.map((i) => i.oid),
      visibility: form.visibility,
    }

    try {
      if (isEditMode.value) {
        await api.post(`/knowledge/update/${props.id}`, body)
        router.push({ name: 'knowledgeDetail', params: { id: props.id! } })
      } else {
        const res = await api.post<{ data: { oid: string } }>(
          '/knowledge/create',
          body
        )
        router.push({
          name: 'knowledgeDetail',
          params: { id: res.data.oid },
        })
      }
    } catch (e: unknown) {
      errorMessage.value = toUserMessage(e, t('knowledge.edit.errorSave'))
    } finally {
      submitting.value = false
    }
  }

  onMounted(async () => {
    if (isEditMode.value) {
      await loadDetail()
    } else {
      const state = window.history.state as KnowledgeEditNavState
      await applyGeneratedDraft(form, state?.generated)
    }
  })
</script>

<style scoped>
  .radio-list {
    display: flex;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  .radio-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    cursor: pointer;
  }
</style>
