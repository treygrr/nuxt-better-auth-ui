<script setup lang="ts">
import type { AuthFormField, ButtonProps, FormSubmitEvent } from '@nuxt/ui';
import { useSignIn, useSignUp } from '@nuxtjs/better-auth/composables';
import {
    computed,
    navigateTo,
    ref,
    useAuthCapabilities,
    useAuthPages,
    useRedirectTarget,
    useRoute,
    useSeoMeta
} from '#imports';

import { oauthErrorMessage } from '../../utils/oauth-errors';
import { providerInfo } from '../../utils/providers';

useSeoMeta({ title: 'Create an account' });

const pages = useAuthPages();
const { capabilities } = useAuthCapabilities();
const redirectTo = useRedirectTarget();
const route = useRoute();
// A failed provider sign-in comes back with Better Auth's ?error= code.
const oauthError = computed(() =>
    typeof route.query.error === 'string' ? oauthErrorMessage(route.query.error) : null
);

const signUp = useSignUp('email');
const social = useSignIn('social');
// With required verification there's no session yet: they're told to check their email.
const checkEmail = ref<string | null>(null);

const fields = computed<AuthFormField[]>(() => {
    const min = capabilities.value?.minPasswordLength ?? 8;
    return [
        { name: 'name', type: 'text', label: 'Name', autocomplete: 'name', required: true },
        { name: 'email', type: 'email', label: 'Email', autocomplete: 'email', required: true },
        {
            name: 'password',
            type: 'password',
            label: 'Password',
            autocomplete: 'new-password',
            help: `At least ${min} characters.`,
            minlength: min,
            maxlength: capabilities.value?.maxPasswordLength,
            required: true
        }
    ];
});
const providers = computed<ButtonProps[]>(() =>
    (capabilities.value?.socialProviders ?? []).map((provider) => ({
        label: `Continue with ${providerInfo(provider).label}`,
        icon: providerInfo(provider).icon,
        loadingAuto: true,
        // Typed from the app's configured providers, which the module can't know: these come from the app's config.
        onClick: () =>
            social.execute({
                provider,
                callbackURL: redirectTo,
                // Brand-new accounts start on the account page; failures come back here with ?error=.
                newUserCallbackURL: pages.account || redirectTo,
                errorCallbackURL: route.fullPath
            } as Parameters<typeof social.execute>[0])
    }))
);
const error = computed(() => signUp.error.value ?? social.error.value);

async function onSubmit(event: FormSubmitEvent<{ name: string; email: string; password: string }>) {
    const requireVerification = capabilities.value?.requireEmailVerification;
    await signUp.execute(
        { ...event.data, callbackURL: redirectTo },
        // With verification required there's no session yet, so show the next step instead.
        {
            onSuccess: async () => {
                if (requireVerification) checkEmail.value = event.data.email;
                else await navigateTo(redirectTo);
            }
        }
    );
}
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <div v-if="checkEmail" class="space-y-4 text-center">
                <UIcon name="i-lucide-mail-check" class="size-10 text-primary mx-auto" />
                <h1 class="text-xl font-semibold text-highlighted">Check your email</h1>
                <p class="text-muted">
                    We've sent a link to <strong class="text-default">{{ checkEmail }}</strong
                    >. Open it to verify your email and finish creating your account.
                </p>
                <UButton
                    v-if="pages.signIn"
                    :to="pages.signIn"
                    label="Back to sign in"
                    variant="subtle"
                    color="neutral"
                />
            </div>
            <UAlert
                v-else-if="capabilities && !capabilities.signUp"
                color="neutral"
                variant="subtle"
                icon="i-lucide-info"
                title="Sign-ups are closed"
                description="New accounts can't be created right now."
            />
            <UAuthForm
                v-else
                :fields="fields"
                :providers="providers"
                title="Create an account"
                icon="i-lucide-user-plus"
                :loading="signUp.status.value === 'pending'"
                :submit="{ label: 'Create account' }"
                @submit="onSubmit"
            >
                <template v-if="pages.signIn" #description>
                    Already have one?
                    <ULink :to="{ path: pages.signIn, query: $route.query }" class="text-primary font-medium"
                        >Sign in</ULink
                    >.
                </template>
                <template #validation>
                    <UAlert
                        v-if="error || oauthError"
                        color="error"
                        icon="i-lucide-circle-alert"
                        title="Couldn't create your account"
                        :description="error?.message ?? oauthError ?? undefined"
                    />
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
