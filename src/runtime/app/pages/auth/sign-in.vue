<script setup lang="ts">
import type { AuthFormField, ButtonProps, FormSubmitEvent } from '@nuxt/ui';
import { useAuthClient, useSignIn, useUserSession, type ActionHandleFor } from '@nuxtjs/better-auth/composables';
import {
    computed,
    navigateTo,
    onMounted,
    useAuthCapabilities,
    useAuthPages,
    useRedirectTarget,
    useRoute,
    useSeoMeta
} from '#imports';

import { oauthErrorMessage } from '../../utils/oauth-errors';
import { passkeyCancelled, type PasskeyClient } from '../../utils/passkey';
import { providerInfo } from '../../utils/providers';

useSeoMeta({ title: 'Sign in' });

const pages = useAuthPages();
const { capabilities } = useAuthCapabilities();
const redirectTo = useRedirectTarget();
const route = useRoute();
// A failed provider sign-in comes back with Better Auth's ?error= code.
const oauthError = computed(() =>
    typeof route.query.error === 'string' ? oauthErrorMessage(route.query.error) : null
);

const email = useSignIn('email');
const social = useSignIn('social');
// Added by the Passkey plugin, which the app's typed client may not know about.
type PasskeySignIn = (
    input?: { autoFill?: boolean },
    options?: { onSuccess?: () => Promise<void> }
) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
const passkey = useSignIn('passkey' as Parameters<typeof useSignIn>[0]) as unknown as ActionHandleFor<PasskeySignIn>;

const fields = computed<AuthFormField[]>(() =>
    capabilities.value?.emailAndPassword
        ? [
              {
                  name: 'email',
                  type: 'email',
                  label: 'Email',
                  // `webauthn` lets the browser offer saved passkeys from the email field.
                  autocomplete: capabilities.value.passkey ? 'email webauthn' : 'email',
                  required: true
              },
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
const providers = computed<ButtonProps[]>(() => [
    ...(capabilities.value?.passkey
        ? [
              {
                  label: 'Sign in with a passkey',
                  icon: 'i-lucide-key-round',
                  loading: passkey.status.value === 'pending',
                  onClick: () =>
                      passkey.execute(
                          {},
                          {
                              onSuccess: async () => {
                                  await navigateTo(redirectTo);
                              }
                          }
                      )
              }
          ]
        : []),
    ...(capabilities.value?.socialProviders ?? []).map((provider) => ({
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
]);

// Saved passkeys offered from the email field (conditional UI), where the browser supports it. Called on the client
// directly, not through `passkey`, so the button doesn't show as busy while the browser waits.
const { fetchSession } = useUserSession();
onMounted(async () => {
    if (!capabilities.value?.passkey || !(await window.PublicKeyCredential?.isConditionalMediationAvailable?.())) {
        return;
    }
    const client = useAuthClient() as unknown as { signIn: Pick<PasskeyClient['signIn'], 'passkey'> } | null;
    const result = await client?.signIn.passkey({ autoFill: true });
    if (!result?.data) return;
    await fetchSession({ force: true });
    await navigateTo(redirectTo);
});

// Unverified accounts are sent a fresh link when they try to sign in, if the app requires verification.
const needsVerification = computed(() => email.error.value?.code === 'EMAIL_NOT_VERIFIED');
// Closing the passkey prompt (or letting it time out) isn't an error worth showing.
const passkeyError = computed(() => (passkeyCancelled(passkey.error.value) ? null : passkey.error.value));
const error = computed(() => email.error.value ?? social.error.value ?? passkeyError.value);

function onSubmit(event: FormSubmitEvent<{ email: string; password: string }>) {
    email.execute(
        { email: event.data.email, password: event.data.password, callbackURL: redirectTo },
        {
            onSuccess: async (context: { data?: { twoFactorRedirect?: boolean; twoFactorMethods?: string[] } }) => {
                // Two-factor users have no session yet: they finish on the two-factor page, which keeps ?redirect=.
                if (context.data?.twoFactorRedirect && pages.twoFactor) {
                    await navigateTo({
                        path: pages.twoFactor,
                        query: { ...route.query, methods: context.data.twoFactorMethods?.join(',') }
                    });
                    return;
                }
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
                        v-else-if="error || oauthError"
                        color="error"
                        icon="i-lucide-circle-alert"
                        title="Couldn't sign in"
                        :description="error?.message ?? oauthError ?? undefined"
                    />
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
