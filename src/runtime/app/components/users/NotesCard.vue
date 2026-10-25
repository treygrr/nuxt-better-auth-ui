<script setup lang="ts">
import {
    $fetch,
    computed,
    ref,
    useAdminCan,
    useAuthI18n,
    useBetterAuthAdminConfig,
    useFetch,
    useToast
} from '#imports';
import { useUserSession } from '@nuxtjs/better-auth/composables';

import { ADMIN_API } from '../../../constants';
import type { UserNote } from '../../../server/notes/plugin';
import type { AdminUser } from '../../types';
import { serverError } from '../../utils/server-error';

/** Private staff notes on a user ("Warned for spam in chat"), newest first. Shown with `admin.notes` on. */
const props = defineProps<{ user: AdminUser }>();
const emit = defineEmits<{ changed: [] }>();

const { auditLog } = useBetterAuthAdminConfig();
const can = useAdminCan();
const canAdd = can({ user: ['update'] });
const canDeleteAny = can({ user: ['delete'] });
const session = useUserSession();
const toast = useToast();
const { t, errorMessage } = useAuthI18n();

const base = `${ADMIN_API}/users/${encodeURIComponent(props.user.id)}/notes`;
const { data: notes, refresh } = useFetch<UserNote[]>(base, {
    key: `better-auth-ui-admin-notes-${props.user.id}`,
    default: () => []
});

/** A failed request in words, translated by its code. */
const message = (error: unknown) => errorMessage(serverError(error));

const draft = ref('');
async function add() {
    if (!draft.value.trim()) return;
    try {
        await $fetch(base, { method: 'POST', body: { body: draft.value } });
        draft.value = '';
        toast.add({ title: t('admin.notes.added'), color: 'success' });
        await refresh();
        emit('changed');
    } catch (error) {
        toast.add({ title: t('admin.notes.addFailed'), description: message(error), color: 'error' });
    }
}

const canDelete = (note: UserNote) => canAdd && (note.authorId === session.user.value?.id || canDeleteAny);

const deleting = ref<UserNote | null>(null);
const deleteOpen = computed({
    get: () => deleting.value !== null,
    set: (value) => {
        if (!value) deleting.value = null;
    }
});
async function remove() {
    try {
        await $fetch(`${base}/${encodeURIComponent(deleting.value!.id)}`, { method: 'DELETE' });
        toast.add({ title: t('admin.notes.deleted'), color: 'success' });
        deleting.value = null;
        await refresh();
        emit('changed');
    } catch (error) {
        toast.add({ title: t('admin.notes.deleteFailed'), description: message(error), color: 'error' });
    }
}
</script>

<template>
    <UPageCard
        :title="t('admin.notes.title')"
        :description="t('admin.notes.description', { name: user.name })"
        variant="subtle"
    >
        <form v-if="canAdd" class="flex flex-col gap-2" @submit.prevent="add">
            <UTextarea
                v-model="draft"
                :placeholder="t('admin.notes.placeholder')"
                :maxlength="2000"
                :rows="2"
                autoresize
                class="w-full"
            />
            <div class="flex justify-end">
                <UButton
                    type="submit"
                    :label="t('admin.notes.add')"
                    icon="i-lucide-sticky-note"
                    size="sm"
                    :disabled="!draft.trim()"
                    loading-auto
                />
            </div>
        </form>

        <p v-if="!notes.length" class="text-sm text-muted">{{ t('admin.notes.none') }}</p>
        <ul v-else class="divide-y divide-default">
            <li v-for="note in notes" :key="note.id" class="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <UIcon name="i-lucide-sticky-note" class="size-5 shrink-0 text-muted mt-0.5" />
                <div class="min-w-0 flex-1">
                    <p class="text-sm text-highlighted whitespace-pre-wrap break-words">{{ note.body }}</p>
                    <p class="text-xs text-muted">
                        {{ t('admin.notes.by', { name: note.authorName || note.authorEmail }) }} ·
                        <NuxtTime :datetime="note.createdAt" date-style="medium" time-style="short" />
                    </p>
                </div>
                <UButton
                    v-if="canDelete(note)"
                    :label="t('admin.common.remove')"
                    color="error"
                    variant="ghost"
                    size="sm"
                    @click="deleting = note"
                />
            </li>
        </ul>

        <UModal
            v-model:open="deleteOpen"
            :title="t('admin.notes.deleteTitle')"
            :description="auditLog ? t('admin.notes.deleteDescription') : undefined"
        >
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton
                        :label="t('admin.common.cancel')"
                        color="neutral"
                        variant="subtle"
                        @click="deleting = null"
                    />
                    <UButton :label="t('admin.notes.deleteNote')" color="error" loading-auto @click="remove" />
                </div>
            </template>
        </UModal>
    </UPageCard>
</template>
