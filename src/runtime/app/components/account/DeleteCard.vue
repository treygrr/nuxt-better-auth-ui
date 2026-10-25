<script setup lang="ts">
import { useAuthClientAction, useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, navigateTo, ref, useAuthCapabilities, useAuthI18n } from '#imports';

import CardTitle from './CardTitle.vue';

/**
 * Deleting the account, as Better Auth's deleteUser decides: with an email confirmation when the app sends one,
 * else straight away after the password (or with a recent sign-in, for accounts without one).
 */
const props = defineProps<{ hasPassword: boolean }>();

const { t, errorMessage } = useAuthI18n();
const { user } = useUserSession();
const { capabilities } = useAuthCapabilities();
const remove = useAuthClientAction((client) => client.deleteUser);

const open = ref(false);
const password = ref('');
const emailSent = ref(false);
const byEmail = computed(() => capabilities.value?.deleteUserByEmail === true);

async function confirm() {
    await remove.execute({
        ...(props.hasPassword && { password: password.value }),
        callbackURL: '/'
    });
    if (remove.error.value) return;
    // Better Auth's reply ({ data: { message } }, as its client returns it) says whether it emailed a confirmation
    // or deleted the account.
    if ((remove.data.value as { data?: { message?: string } } | null)?.data?.message === 'Verification email sent') {
        emailSent.value = true;
        open.value = false;
        return;
    }
    // Deleted: Better Auth has signed them out.
    await navigateTo('/', { external: true });
}
</script>

<template>
    <UPageCard
        :title="t('account.delete.title')"
        :description="t('account.delete.description')"
        variant="subtle"
        :ui="{ title: 'text-error' }"
    >
        <template #title
            ><CardTitle icon="i-lucide-trash-2" :title="t('account.delete.title')" color="error"
        /></template>
        <UAlert
            v-if="emailSent"
            color="warning"
            variant="subtle"
            icon="i-lucide-mail"
            :title="t('account.email.checkTitle')"
            :description="t('account.delete.emailSent', { email: user?.email ?? '' })"
        />
        <div v-else>
            <UButton
                :label="t('account.delete.button')"
                color="error"
                variant="outline"
                icon="i-lucide-trash"
                @click="open = true"
            />
        </div>

        <UModal
            v-model:open="open"
            :title="t('account.delete.confirmTitle')"
            :description="t('account.delete.cantUndo')"
        >
            <template #body>
                <form class="space-y-4" @submit.prevent="confirm">
                    <p class="text-sm text-muted">
                        {{ byEmail ? t('account.delete.byEmail') : t('account.delete.straightAway') }}
                    </p>
                    <UFormField v-if="hasPassword" :label="t('account.twoFactor.yourPassword')" required>
                        <UInput
                            v-model="password"
                            type="password"
                            autocomplete="current-password"
                            required
                            class="w-full"
                        />
                    </UFormField>
                    <p v-if="remove.error.value" class="text-sm text-error">
                        {{
                            remove.error.value.code === 'SESSION_EXPIRED'
                                ? t('account.delete.signInAgain')
                                : errorMessage(remove.error.value)
                        }}
                    </p>
                    <div class="flex justify-end gap-2">
                        <UButton :label="t('common.cancel')" color="neutral" variant="subtle" @click="open = false" />
                        <UButton
                            type="submit"
                            :label="byEmail ? t('account.delete.emailLink') : t('account.delete.button')"
                            color="error"
                            :loading="remove.status.value === 'pending'"
                        />
                    </div>
                </form>
            </template>
        </UModal>
    </UPageCard>
</template>
