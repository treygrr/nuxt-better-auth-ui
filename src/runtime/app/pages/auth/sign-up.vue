<script setup lang="ts">
import type { AuthFormField, ButtonProps, FormSubmitEvent } from '@nuxt/ui';
import { useSignUp, useUserSession } from '@nuxtjs/better-auth/composables';
import {
    computed,
    navigateTo,
    ref,
    useAuthCapabilities,
    useAuthI18n,
    useAuthPages,
    useAuthRedirectTarget,
    useRoute,
    useSeoMeta
} from '#imports';

import Captcha from '../../components/auth/Captcha.vue';
import { useCaptcha } from '../../utils/captcha';
import { oauthErrorMessage } from '../../utils/oauth-errors';
import { useProviderSignIn } from '../../utils/provider-sign-in';
import { providerInfo } from '../../utils/providers';

const { t, errorMessage } = useAuthI18n();
useSeoMeta({ title: () => t('signUp.title') });

const pages = useAuthPages();
const { capabilities } = useAuthCapabilities();
const redirectTo = useAuthRedirectTarget();
const route = useRoute();
// A failed provider sign-in comes back with Better Auth's ?error= code.
const oauthError = computed(() =>
    typeof route.query.error === 'string' ? oauthErrorMessage(route.query.error, t) : null
);

// Guests (Anonymous plugin) may come here to keep their account: signing up moves them to the new one.
const { user } = useUserSession();
const isGuest = computed(() => (user.value as { isAnonymous?: boolean | null } | null)?.isAnonymous === true);

const signUp = useSignUp('email');
// Providers in a popup with the OAuth Popup plugin, else Better Auth's redirect.
const { signInWith, social, popupError } = useProviderSignIn();
const captcha = useCaptcha('/sign-up/email');
// With required verification there's no session yet: they're told to check their email.
const checkEmail = ref<string | null>(null);

const fields = computed<AuthFormField[]>(() => {
    const min = capabilities.value?.minPasswordLength ?? 8;
    const username = capabilities.value?.username;
    return [
        { name: 'name', type: 'text', label: t('common.name'), autocomplete: 'name', required: true },
        ...(username
            ? [
                  {
                      name: 'username',
                      type: 'text' as const,
                      label: t('common.username'),
                      autocomplete: 'username',
                      help: t('signUp.usernameHelp', { min: username.minLength, max: username.maxLength }),
                      minlength: username.minLength,
                      maxlength: username.maxLength,
                      required: true
                  }
              ]
            : []),
        { name: 'email', type: 'email', label: t('common.email'), autocomplete: 'email', required: true },
        {
            name: 'password',
            type: 'password',
            label: t('common.password'),
            autocomplete: 'new-password',
            help: capabilities.value?.haveIBeenPwned
                ? `${t('password.minimum', { min })} ${t('password.breachChecked')}`
                : t('password.minimum', { min }),
            minlength: min,
            maxlength: capabilities.value?.maxPasswordLength,
            required: true
        }
    ];
});
const providers = computed<ButtonProps[]>(() =>
    (capabilities.value?.socialProviders ?? []).map((provider) => ({
        label: t('signIn.continueWith', { provider: providerInfo(provider).label }),
        icon: providerInfo(provider).icon,
        loadingAuto: true,
        onClick: () =>
            signInWith(provider, {
                callbackURL: redirectTo,
                // Brand-new accounts start on the account page; failures come back here with ?error=.
                newUserCallbackURL: pages.account || redirectTo,
                errorCallbackURL: route.fullPath
            })
    }))
);
const captchaMissing = ref(false);
const error = computed(() =>
    captchaMissing.value
        ? t('captcha.required')
        : errorMessage(signUp.error.value ?? social.error.value ?? popupError.value) || oauthError.value
);

type SignUpData = { name: string; email: string; password: string; username?: string };
async function onSubmit(event: FormSubmitEvent<SignUpData>) {
    captchaMissing.value = captcha.missing();
    if (captchaMissing.value) return;
    const requireVerification = capabilities.value?.requireEmailVerification;
    await signUp.execute({ ...event.data, callbackURL: redirectTo } as Parameters<typeof signUp.execute>[0], {
        headers: captcha.headers(),
        // With verification required there's no session yet, so show the next step instead.
        onSuccess: async () => {
            if (requireVerification) checkEmail.value = event.data.email;
            else await navigateTo(redirectTo);
        }
    });
    captcha.reset();
}
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <div v-if="checkEmail" class="space-y-4 text-center">
                <UIcon name="i-lucide-mail-check" class="size-10 text-primary mx-auto" />
                <h1 class="text-xl font-semibold text-highlighted">{{ t('signUp.checkEmail.title') }}</h1>
                <p class="text-muted">{{ t('signUp.checkEmail.description', { email: checkEmail }) }}</p>
                <UButton
                    v-if="pages.signIn"
                    :to="pages.signIn"
                    :label="t('common.backToSignIn')"
                    variant="subtle"
                    color="neutral"
                />
            </div>
            <UAlert
                v-else-if="capabilities && !capabilities.signUp"
                color="neutral"
                variant="subtle"
                icon="i-lucide-info"
                :title="t('signUp.closed.title')"
                :description="t('signUp.closed.description')"
            />
            <UAuthForm
                v-else
                :fields="fields"
                :providers="providers"
                :title="t('signUp.title')"
                icon="i-lucide-user-plus"
                :loading="signUp.status.value === 'pending'"
                :submit="{ label: t('signUp.submit') }"
                @submit="onSubmit"
            >
                <template v-if="pages.signIn || isGuest" #description>
                    <UAlert
                        v-if="isGuest"
                        color="info"
                        variant="subtle"
                        icon="i-lucide-user-round"
                        :title="t('signIn.guest.keepTitle')"
                        :description="t('signIn.guest.keepDescription')"
                        class="mb-3 text-start"
                    />
                    <template v-if="pages.signIn">
                        {{ t('signUp.haveAccount') }}
                        <ULink :to="{ path: pages.signIn, query: $route.query }" class="text-primary font-medium">{{
                            t('signUp.signIn')
                        }}</ULink
                        >.
                    </template>
                </template>
                <template #validation>
                    <Captcha
                        v-if="captcha.enabled"
                        :ref="(el) => (captcha.widget.value = el as never)"
                        v-model="captcha.token.value"
                    />
                    <UAlert
                        v-if="error"
                        color="error"
                        icon="i-lucide-circle-alert"
                        :title="t('signUp.failed')"
                        :description="error"
                    />
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
