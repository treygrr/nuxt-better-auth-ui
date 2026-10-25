<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui';
import { useAuthClientAction } from '@nuxtjs/better-auth/composables';
import { ref, useAuthPages, useSeoMeta } from '#imports';

useSeoMeta({ title: 'Forgot your password?' });

const pages = useAuthPages();
const requestReset = useAuthClientAction((client) => client.requestPasswordReset);
const sentTo = ref<string | null>(null);

const fields: AuthFormField[] = [
    { name: 'email', type: 'email', label: 'Email', autocomplete: 'email', required: true }
];

async function onSubmit(event: FormSubmitEvent<{ email: string }>) {
    // Better Auth answers the same whether or not the email has an account, so this never reveals which do.
    await requestReset.execute({ email: event.data.email, redirectTo: pages.resetPassword || '/' });
    if (!requestReset.error.value) sentTo.value = event.data.email;
}
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <div v-if="sentTo" class="space-y-4 text-center">
                <UIcon name="i-lucide-mail-check" class="size-10 text-primary mx-auto" />
                <h1 class="text-xl font-semibold text-highlighted">Check your email</h1>
                <p class="text-muted">
                    If <strong class="text-default">{{ sentTo }}</strong> has an account, we've sent it a link to choose
                    a new password.
                </p>
                <UButton
                    v-if="pages.signIn"
                    :to="pages.signIn"
                    label="Back to sign in"
                    variant="subtle"
                    color="neutral"
                />
            </div>
            <UAuthForm
                v-else
                :fields="fields"
                title="Forgot your password?"
                description="We'll email you a link to choose a new one."
                icon="i-lucide-key-round"
                :loading="requestReset.status.value === 'pending'"
                :submit="{ label: 'Send reset link' }"
                @submit="onSubmit"
            >
                <template v-if="pages.signIn" #footer>
                    Remembered it? <ULink :to="pages.signIn" class="text-primary font-medium">Sign in</ULink>.
                </template>
                <template #validation>
                    <UAlert
                        v-if="requestReset.error.value"
                        color="error"
                        icon="i-lucide-circle-alert"
                        title="Couldn't send the link"
                        :description="requestReset.error.value.message"
                    />
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
