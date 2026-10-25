<script setup lang="ts">
import { useAuthClient, useUserSession } from '@nuxtjs/better-auth/composables';
import { navigateTo, ref, useAuthCapabilities, useAuthI18n, useAuthPages, useToast } from '#imports';

import { useSignOutTarget } from '../../composables/useAuthPages';

/**
 * For guests (Better Auth's Anonymous plugin): keep the account by signing up or in (Better Auth moves them to that
 * account), or delete it.
 */
const { t, errorMessage } = useAuthI18n();
const pages = useAuthPages();
const { capabilities } = useAuthCapabilities();
const { fetchSession } = useUserSession();
const toast = useToast();
const signOutTarget = useSignOutTarget();

// Back here once they've kept it.
const query = pages.account ? { redirect: pages.account } : {};

type GuestClient = {
    deleteAnonymousUser(): Promise<{ error: { message?: string; code?: string } | null }>;
};
const confirmDelete = ref(false);
async function remove() {
    const { error } = await (useAuthClient() as unknown as GuestClient).deleteAnonymousUser();
    if (error) {
        toast.add({ title: t('account.guest.deleteFailed'), description: errorMessage(error), color: 'error' });
        return;
    }
    confirmDelete.value = false;
    await fetchSession({ force: true });
    await navigateTo(signOutTarget);
}
</script>

<template>
    <UPageCard
        :title="t('account.guest.title')"
        :description="t('account.guest.description')"
        icon="i-lucide-user-round"
        variant="subtle"
    >
        <div class="flex flex-wrap gap-2">
            <UButton
                v-if="pages.signUp && capabilities?.signUp"
                :to="{ path: pages.signUp, query }"
                :label="t('account.guest.signUp')"
                icon="i-lucide-user-plus"
            />
            <UButton
                v-if="pages.signIn"
                :to="{ path: pages.signIn, query }"
                :label="t('account.guest.signIn')"
                icon="i-lucide-log-in"
                color="neutral"
                variant="outline"
            />
            <UButton
                v-if="capabilities?.anonymous?.deleteAccount"
                :label="t('account.guest.delete')"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                class="ms-auto"
                @click="confirmDelete = true"
            />
        </div>

        <UModal
            v-model:open="confirmDelete"
            :title="t('account.guest.deleteTitle')"
            :description="t('account.guest.deleteDescription')"
        >
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton
                        :label="t('common.cancel')"
                        color="neutral"
                        variant="subtle"
                        @click="confirmDelete = false"
                    />
                    <UButton :label="t('account.guest.delete')" color="error" loading-auto @click="remove" />
                </div>
            </template>
        </UModal>
    </UPageCard>
</template>
