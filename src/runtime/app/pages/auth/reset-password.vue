<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui';
import { useAuthClientAction } from '@nuxtjs/better-auth/composables';
import { computed, ref, useAuthCapabilities, useAuthPages, useRoute, useSeoMeta } from '#imports';

useSeoMeta({ title: 'Choose a new password' });

const pages = useAuthPages();
const { capabilities } = useAuthCapabilities();
const route = useRoute();
// Better Auth sends the link here with ?token=, or ?error=INVALID_TOKEN when it has expired or been used.
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : null));
const linkError = computed(() => route.query.error);

const resetPassword = useAuthClientAction((client) => client.resetPassword);
const done = ref(false);

const fields = computed<AuthFormField[]>(() => {
    const min = capabilities.value?.minPasswordLength ?? 8;
    return [
        {
            name: 'password',
            type: 'password',
            label: 'New password',
            autocomplete: 'new-password',
            help: `At least ${min} characters.`,
            minlength: min,
            maxlength: capabilities.value?.maxPasswordLength,
            required: true
        }
    ];
});

async function onSubmit(event: FormSubmitEvent<{ password: string }>) {
    await resetPassword.execute({ newPassword: event.data.password, token: token.value! });
    if (!resetPassword.error.value) done.value = true;
}
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <div v-if="done" class="space-y-4 text-center">
                <UIcon name="i-lucide-circle-check" class="size-10 text-success mx-auto" />
                <h1 class="text-xl font-semibold text-highlighted">Password changed</h1>
                <p class="text-muted">Sign in with your new password.</p>
                <UButton v-if="pages.signIn" :to="pages.signIn" label="Sign in" />
            </div>
            <div v-else-if="linkError || !token" class="space-y-4 text-center">
                <UIcon name="i-lucide-link-2-off" class="size-10 text-warning mx-auto" />
                <h1 class="text-xl font-semibold text-highlighted">This link doesn't work</h1>
                <p class="text-muted">It may have expired or been used already. Ask for a new one.</p>
                <UButton v-if="pages.forgotPassword" :to="pages.forgotPassword" label="Send a new link" />
            </div>
            <UAuthForm
                v-else
                :fields="fields"
                title="Choose a new password"
                icon="i-lucide-key-round"
                :loading="resetPassword.status.value === 'pending'"
                :submit="{ label: 'Change password' }"
                @submit="onSubmit"
            >
                <template #validation>
                    <UAlert
                        v-if="resetPassword.error.value"
                        color="error"
                        icon="i-lucide-circle-alert"
                        title="Couldn't change your password"
                        :description="resetPassword.error.value.message"
                    />
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
