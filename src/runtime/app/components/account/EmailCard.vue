<script setup lang="ts">
import { useAuthClientAction, useUserSession } from '@nuxtjs/better-auth/composables';
import { ref, useAuthCapabilities, useAuthPages, useToast } from '#imports';

/** The email address: verification status, resending the link, and changing it when the app allows. */
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
        toast.add({ title: "Couldn't send the link", description: resend.error.value.message, color: 'error' });
    } else {
        toast.add({ title: 'Verification link sent', description: user.value!.email, color: 'success' });
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
    <UPageCard v-if="user" title="Email" :description="user.email" variant="subtle">
        <template #title>
            <span class="flex items-center gap-2">
                Email
                <UBadge
                    :label="user.emailVerified ? 'Verified' : 'Not verified'"
                    :color="user.emailVerified ? 'success' : 'warning'"
                    variant="subtle"
                    size="sm"
                />
            </span>
        </template>

        <div v-if="!user.emailVerified && capabilities?.emailVerification" class="flex flex-wrap items-center gap-3">
            <p class="text-sm text-muted flex-1">Verify your email so you can recover your account.</p>
            <UButton
                label="Send verification link"
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
                title="Check your email"
                :description="
                    approvalFirst
                        ? `We've sent a link to ${user.email} to approve the change, then we'll ask ${changeSent} to confirm. Your address stays the same until then.`
                        : `Open the link we sent to ${changeSent} to finish changing your email. Your current address stays until then.`
                "
            />
            <form v-else class="flex flex-wrap items-end gap-3" @submit.prevent="changeEmail">
                <UFormField label="New email" class="flex-1 min-w-60">
                    <UInput v-model="newEmail" type="email" autocomplete="email" required class="w-full" />
                </UFormField>
                <UButton
                    type="submit"
                    label="Change email"
                    color="neutral"
                    variant="outline"
                    :loading="change.status.value === 'pending'"
                />
            </form>
            <p v-if="change.error.value" class="text-sm text-error mt-2">{{ change.error.value.message }}</p>
        </template>
    </UPageCard>
</template>
