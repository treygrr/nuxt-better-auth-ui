<script setup lang="ts">
import type { AuthFormField, ButtonProps, FormSubmitEvent } from '@nuxt/ui';
import { useSignIn } from '@nuxtjs/better-auth/composables';
import { computed, navigateTo, useAuthCapabilities, useAuthPages, useRedirectTarget, useSeoMeta } from '#imports';

import { providerInfo } from '../../utils/providers';

useSeoMeta({ title: 'Sign in' });

const pages = useAuthPages();
const { capabilities } = useAuthCapabilities();
const redirectTo = useRedirectTarget();

const email = useSignIn('email');
const social = useSignIn('social');

const fields = computed<AuthFormField[]>(() =>
    capabilities.value?.emailAndPassword
        ? [
              { name: 'email', type: 'email', label: 'Email', autocomplete: 'email', required: true },
              {
                  name: 'password',
                  type: 'password',
                  label: 'Password',
                  autocomplete: 'current-password',
                  required: true
              }
          ]
        : []
);
const providers = computed<ButtonProps[]>(() =>
    (capabilities.value?.socialProviders ?? []).map((provider) => ({
        label: `Continue with ${providerInfo(provider).label}`,
        icon: providerInfo(provider).icon,
        loadingAuto: true,
        // Typed from the app's configured providers, which the module can't know: these come from the app's config.
        onClick: () => social.execute({ provider, callbackURL: redirectTo } as Parameters<typeof social.execute>[0])
    }))
);

// Unverified accounts are sent a fresh link when they try to sign in, if the app requires verification.
const needsVerification = computed(() => email.error.value?.code === 'EMAIL_NOT_VERIFIED');
const error = computed(() => email.error.value ?? social.error.value);

function onSubmit(event: FormSubmitEvent<{ email: string; password: string }>) {
    email.execute(
        { email: event.data.email, password: event.data.password, callbackURL: redirectTo },
        {
            onSuccess: async () => {
                await navigateTo(redirectTo);
            }
        }
    );
}
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <UAuthForm
                :fields="fields"
                :providers="providers"
                title="Sign in"
                icon="i-lucide-lock"
                :loading="email.status.value === 'pending'"
                :submit="fields.length ? { label: 'Sign in' } : undefined"
                @submit="onSubmit"
            >
                <template v-if="pages.signUp && capabilities?.signUp" #description>
                    No account yet?
                    <ULink :to="{ path: pages.signUp, query: $route.query }" class="text-primary font-medium"
                        >Sign up</ULink
                    >.
                </template>

                <template v-if="pages.forgotPassword && capabilities?.resetPassword" #password-hint>
                    <ULink :to="pages.forgotPassword" class="text-primary font-medium" tabindex="-1"
                        >Forgot password?</ULink
                    >
                </template>

                <template #validation>
                    <UAlert
                        v-if="needsVerification"
                        color="warning"
                        icon="i-lucide-mail"
                        title="Verify your email first"
                        description="We've sent you a new verification link. Open it, then sign in."
                    />
                    <UAlert
                        v-else-if="error"
                        color="error"
                        icon="i-lucide-circle-alert"
                        title="Couldn't sign in"
                        :description="error.message"
                    />
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
