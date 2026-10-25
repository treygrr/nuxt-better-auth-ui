<script setup lang="ts">
import { useAuthClientAction, useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, navigateTo, ref, useAuthCapabilities } from '#imports';

/**
 * Deleting the account, as Better Auth's deleteUser decides: with an email confirmation when the app sends one,
 * else straight away after the password (or with a recent sign-in, for accounts without one).
 */
const props = defineProps<{ hasPassword: boolean }>();

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
        title="Delete account"
        description="Permanently delete your account and everything in it. This can't be undone."
        variant="subtle"
        :ui="{ title: 'text-error' }"
    >
        <UAlert
            v-if="emailSent"
            color="warning"
            variant="subtle"
            icon="i-lucide-mail"
            title="Check your email"
            :description="`Open the link we sent to ${user?.email} to confirm. Your account stays until you do.`"
        />
        <div v-else>
            <UButton
                label="Delete my account"
                color="error"
                variant="outline"
                icon="i-lucide-trash"
                @click="open = true"
            />
        </div>

        <UModal v-model:open="open" title="Delete your account?" description="This can't be undone.">
            <template #body>
                <form class="space-y-4" @submit.prevent="confirm">
                    <p class="text-sm text-muted">
                        <template v-if="byEmail">We'll email you a link to confirm.</template>
                        <template v-else>Your account and everything in it will be deleted straight away.</template>
                    </p>
                    <UFormField v-if="hasPassword" label="Your password" required>
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
                                ? 'For your security, sign out and back in, then try again.'
                                : remove.error.value.message
                        }}
                    </p>
                    <div class="flex justify-end gap-2">
                        <UButton label="Cancel" color="neutral" variant="subtle" @click="open = false" />
                        <UButton
                            type="submit"
                            :label="byEmail ? 'Email me a link' : 'Delete my account'"
                            color="error"
                            :loading="remove.status.value === 'pending'"
                        />
                    </div>
                </form>
            </template>
        </UModal>
    </UPageCard>
</template>
