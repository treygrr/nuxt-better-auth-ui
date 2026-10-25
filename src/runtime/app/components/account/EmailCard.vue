<script setup lang="ts">
import { useAuthClientAction, useUserSession } from '@nuxtjs/better-auth/composables';
import { ref, useAuthCapabilities, useAuthI18n, useAuthPages, useToast } from '#imports';

import CardTitle from './CardTitle.vue';

/** The email address: verification status, resending the link, and changing it when the app allows. */
const { t, errorMessage } = useAuthI18n();
const { user } = useUserSession();
const { capabilities } = useAuthCapabilities();
const pages = useAuthPages();
const toast = useToast();

const resend = useAuthClientAction((client) => client.sendVerificationEmail);
const change = useAuthClientAction((client) => client.changeEmail);
const newEmail = ref('');
const changeSent = ref<string | null>(null);

async function resendLink() {
    await resend.execute({ email: user.value!.email, callbackURL: pages.account || '/' });
    if (resend.error.value) {
        toast.add({
            title: t('account.email.resendFailed'),
            description: errorMessage(resend.error.value),
            color: 'error'
        });
    } else {
        toast.add({ title: t('account.email.resent'), description: user.value!.email, color: 'success' });
    }
}

// Better Auth asks the current address to approve the change only when it's verified; otherwise the link goes
// straight to the new address.
const approvalFirst = ref(false);

async function changeEmail() {
    approvalFirst.value = !!(capabilities.value?.changeEmailConfirmation && user.value?.emailVerified);
    await change.execute({ newEmail: newEmail.value.trim(), callbackURL: pages.account || '/' });
    if (!change.error.value) {
        changeSent.value = newEmail.value.trim();
        newEmail.value = '';
    }
}
</script>

<template>
    <UPageCard v-if="user" :title="t('common.email')" :description="user.email" variant="subtle">
        <template #title>
            <CardTitle icon="i-lucide-mail" :title="t('common.email')">
                <UBadge
                    :label="user.emailVerified ? t('account.overview.verified') : t('account.email.notVerified')"
                    :color="user.emailVerified ? 'success' : 'warning'"
                    variant="subtle"
                    size="sm"
                />
            </CardTitle>
        </template>

        <div v-if="!user.emailVerified && capabilities?.emailVerification" class="flex flex-wrap items-center gap-3">
            <p class="text-sm text-muted flex-1">{{ t('account.email.verifyHint') }}</p>
            <UButton
                :label="t('account.email.resend')"
                icon="i-lucide-mail"
                color="neutral"
                variant="outline"
                :loading="resend.status.value === 'pending'"
                @click="resendLink"
            />
        </div>

        <template v-if="capabilities?.changeEmail">
            <UAlert
                v-if="changeSent"
                color="success"
                variant="subtle"
                icon="i-lucide-mail-check"
                :title="t('account.email.checkTitle')"
                :description="
                    approvalFirst
                        ? t('account.email.approvalFirst', { current: user.email, next: changeSent })
                        : t('account.email.confirmNew', { next: changeSent })
                "
            />
            <form v-else class="flex flex-wrap items-end gap-3" @submit.prevent="changeEmail">
                <UFormField :label="t('account.email.newEmail')" class="flex-1 min-w-60">
                    <UInput v-model="newEmail" type="email" autocomplete="email" required class="w-full" />
                </UFormField>
                <UButton
                    type="submit"
                    :label="t('account.email.change')"
                    color="neutral"
                    variant="outline"
                    :loading="change.status.value === 'pending'"
                />
            </form>
            <p v-if="change.error.value" class="text-sm text-error mt-2">{{ errorMessage(change.error.value) }}</p>
        </template>
    </UPageCard>
</template>
