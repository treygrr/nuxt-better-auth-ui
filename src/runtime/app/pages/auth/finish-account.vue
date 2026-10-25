<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui';
import { useAuthClientAction, useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, navigateTo, ref, useAuthI18n, useRedirectTarget, useSeoMeta } from '#imports';

import { useSignOutTarget } from '../../composables/useAuthPages';
import { isPlaceholderEmail } from '../../../server/providers/index';

/**
 * For accounts from a provider that shares no email (Epic Games, Battle.net, …): they add one, through Better Auth's
 * change-email, which sends a link to it; opening the link makes it their email. Until then the app sends them here.
 */
const { t, errorMessage } = useAuthI18n();
useSeoMeta({ title: () => t('finishAccount.title') });

const { user, signOut } = useUserSession();
const redirectTo = useRedirectTarget();
const signOutTarget = useSignOutTarget();
const done = computed(() => !isPlaceholderEmail((user.value as { email?: string } | null)?.email));

const changeEmail = useAuthClientAction((client) => client.changeEmail);
const sentTo = ref<string | null>(null);
const fields = computed<AuthFormField[]>(() => [
    { name: 'email', type: 'email', label: t('common.email'), autocomplete: 'email', required: true }
]);
async function onSubmit(event: FormSubmitEvent<{ email: string }>) {
    // The link comes back to where they were going.
    await changeEmail.execute({ newEmail: event.data.email, callbackURL: redirectTo });
    if (!changeEmail.error.value) sentTo.value = event.data.email;
}
const leave = () =>
    signOut({
        onSuccess: async () => {
            await navigateTo(signOutTarget);
        }
    });
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <div v-if="done" class="space-y-4 text-center">
                <UIcon name="i-lucide-circle-check" class="size-10 text-success mx-auto" />
                <h1 class="text-xl font-semibold text-highlighted">{{ t('finishAccount.doneTitle') }}</h1>
                <UButton :label="t('common.continue')" @click="navigateTo(redirectTo)" />
            </div>

            <div v-else-if="sentTo" class="space-y-4 text-center">
                <UIcon name="i-lucide-mail-check" class="size-10 text-primary mx-auto" />
                <h1 class="text-xl font-semibold text-highlighted">{{ t('finishAccount.sentTitle') }}</h1>
                <p class="text-muted">{{ t('finishAccount.sentDescription', { email: sentTo }) }}</p>
                <UButton
                    :label="t('finishAccount.otherEmail')"
                    variant="subtle"
                    color="neutral"
                    @click="sentTo = null"
                />
            </div>

            <UAuthForm
                v-else
                :fields="fields"
                :title="t('finishAccount.title')"
                :description="t('finishAccount.description')"
                icon="i-lucide-mail-plus"
                :loading="changeEmail.status.value === 'pending'"
                :submit="{ label: t('finishAccount.submit') }"
                @submit="onSubmit"
            >
                <template #validation>
                    <UAlert
                        v-if="changeEmail.error.value"
                        color="error"
                        icon="i-lucide-circle-alert"
                        :title="t('finishAccount.failed')"
                        :description="errorMessage(changeEmail.error.value)"
                    />
                </template>
                <template #footer>
                    <UButton :label="t('account.signOut')" variant="link" color="neutral" @click="leave" />
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
