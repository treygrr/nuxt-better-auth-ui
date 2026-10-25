<script setup lang="ts">
import type { AuthFormField, ButtonProps, FormSubmitEvent } from '@nuxt/ui';
import { useAuthClient, useSignIn, useUserSession, type ActionHandleFor } from '@nuxtjs/better-auth/composables';
import {
    computed,
    navigateTo,
    onMounted,
    ref,
    useAuthCapabilities,
    useAuthI18n,
    useAuthPages,
    useCookie,
    useRedirectTarget,
    useRoute,
    useSeoMeta
} from '#imports';

import Captcha from '../../components/auth/Captcha.vue';
import { useCaptcha } from '../../utils/captcha';
import { oauthErrorMessage } from '../../utils/oauth-errors';
import { passkeyCancelled, type PasskeyClient } from '../../utils/passkey';
import { useProviderSignIn } from '../../utils/provider-sign-in';
import { providerInfo } from '../../utils/providers';

const { t, errorMessage } = useAuthI18n();
useSeoMeta({ title: () => t('signIn.title') });

const pages = useAuthPages();
const { capabilities } = useAuthCapabilities();
const redirectTo = useRedirectTarget();
const route = useRoute();
// A failed provider sign-in, or an expired sign-in link, comes back with Better Auth's ?error= code.
const oauthError = computed(() =>
    typeof route.query.error === 'string' ? oauthErrorMessage(route.query.error, t) : null
);

// The Better Auth methods the module may add, which the app's typed client may not know about.
type Result = Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
type Options = { headers?: Record<string, string>; onSuccess?: (context: never) => Promise<void> };
const handle = <Input,>(name: string) =>
    useSignIn(name as Parameters<typeof useSignIn>[0]) as unknown as ActionHandleFor<
        (input: Input, options?: Options) => Result
    >;
const email = useSignIn('email');
// Providers in a popup with the OAuth Popup plugin, else Better Auth's redirect.
const { signInWith, social, popupError } = useProviderSignIn();
const username = handle<{ username: string; password: string }>('username');
const passkey = handle<{ autoFill?: boolean }>('passkey');
const magicLink = handle<{ email: string; callbackURL: string; newUserCallbackURL: string; errorCallbackURL: string }>(
    'magicLink'
);
const emailOtp = handle<{ email: string; otp: string }>('emailOtp');
const guest = handle<Record<string, never>>('anonymous');
type EmailOtpClient = {
    emailOtp: {
        sendVerificationOtp(
            input: { email: string; type: 'sign-in' },
            options?: { headers?: Record<string, string> }
        ): Result;
    };
};
type PhoneClient = {
    phoneNumber: {
        sendOtp(input: { phoneNumber: string }, options?: { headers?: Record<string, string> }): Result;
        verify(input: { phoneNumber: string; code: string }): Result;
    };
};

// How they signed in last time, from the Last Login Method plugin's cookie (read on the server too).
const lastMethod = useCookie<string | null>('better-auth.last_used_login_method', { readonly: true });
const lastUsed = computed(() => (capabilities.value?.lastLoginMethod ? lastMethod.value : null));
const lastUsedLabel = computed(() => {
    const method = lastUsed.value;
    if (!method || method === 'anonymous') return null;
    if (method === 'email') return t('signIn.methods.password');
    if (method === 'passkey') return t('signIn.methods.passkey');
    if (method === 'magic-link') return t('signIn.methods.magicLink');
    if (method === 'email-otp') return t('signIn.methods.emailCode');
    if (method === 'phone-number') return t('signIn.methods.phone');
    return providerInfo(method).label;
});

// Signing in with a password, or (with magic links, email codes or phone numbers) asking for a link or a code instead,
// or single sign-on.
const mode = ref<'password' | 'link' | 'linkSent' | 'code' | 'codeSent' | 'phone' | 'phoneSent' | 'sso'>('password');
const linkSentTo = ref('');
const captcha = useCaptcha('/sign-in/email');
const linkCaptcha = useCaptcha('/sign-in/magic-link');
const codeCaptcha = useCaptcha('/email-otp/send-verification-otp');
const phoneCaptcha = useCaptcha('/phone-number/send-otp');

const fields = computed<AuthFormField[]>(() =>
    capabilities.value?.emailAndPassword
        ? [
              {
                  name: 'email',
                  // With usernames, either works: an @ means an email.
                  type: capabilities.value.username ? 'text' : 'email',
                  label: capabilities.value.username ? t('signIn.emailOrUsername') : t('common.email'),
                  // `webauthn` lets the browser offer saved passkeys from this field.
                  autocomplete: `${capabilities.value.username ? 'username' : 'email'}${capabilities.value.passkey ? ' webauthn' : ''}`,
                  required: true
              },
              {
                  name: 'password',
                  type: 'password',
                  label: t('common.password'),
                  autocomplete: 'current-password',
                  required: true
              }
          ]
        : []
);
const linkFields = computed<AuthFormField[]>(() => [
    { name: 'email', type: 'email', label: t('common.email'), autocomplete: 'email', required: true }
]);

// Guests (Anonymous plugin) may come here to keep their account: signing in links it to the one they sign in to.
const { user: sessionUser, fetchSession } = useUserSession();
const isGuest = computed(() => (sessionUser.value as { isAnonymous?: boolean | null } | null)?.isAnonymous === true);
// With multi-session, signed-in users come here to add another account (?addAccount=1): they stay signed in to this one.
const addingAccount = computed(() => !!sessionUser.value && !isGuest.value && !!route.query.addAccount);

// The method used last time stands out.
const highlight = (method: string): Partial<ButtonProps> =>
    lastUsed.value === method ? { color: 'primary', variant: 'soft' } : {};
// The other ways to sign in, under the form: the sign-in providers first, as a grid of square icons (their names for
// screen readers and on hover), then this app's own methods two by two with short labels (the full wording on
// hover), SSO across the width, and guests as a quieter link at the end.
const methods = computed<ButtonProps[]>(() => [
    ...(capabilities.value?.passkey
        ? [
              {
                  label: t('signIn.options.passkey'),
                  title: t('signIn.passkey'),
                  icon: 'i-lucide-key-round',
                  loading: passkey.status.value === 'pending',
                  ...highlight('passkey'),
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
    ...(capabilities.value?.magicLink
        ? [
              {
                  label: t('signIn.options.magicLink'),
                  title: t('signIn.magicLink.button'),
                  icon: 'i-lucide-wand-sparkles',
                  ...highlight('magic-link'),
                  onClick: () => {
                      mode.value = 'link';
                  }
              }
          ]
        : []),
    ...(capabilities.value?.emailOtp
        ? [
              {
                  label: t('signIn.options.emailCode'),
                  title: t('signIn.emailCode.button'),
                  icon: 'i-lucide-mail',
                  ...highlight('email-otp'),
                  onClick: () => {
                      mode.value = 'code';
                  }
              }
          ]
        : []),
    ...(capabilities.value?.phoneNumber
        ? [
              {
                  label: t('signIn.options.phone'),
                  title: t('signIn.phone.button'),
                  icon: 'i-lucide-smartphone',
                  ...highlight('phone-number'),
                  onClick: () => {
                      mode.value = 'phone';
                  }
              }
          ]
        : [])
]);
const ssoButtons = computed<ButtonProps[]>(() => [
    ...(capabilities.value?.sso
        ? [
              {
                  label: t('signIn.sso.button'),
                  icon: 'i-lucide-building',
                  onClick: () => {
                      mode.value = 'sso';
                  }
              }
          ]
        : [])
]);
const socials = computed<ButtonProps[]>(() =>
    (capabilities.value?.socialProviders ?? []).map((provider) => ({
        'aria-label': t('signIn.continueWith', { provider: providerInfo(provider).label }),
        title: t('signIn.continueWith', { provider: providerInfo(provider).label }),
        icon: providerInfo(provider).icon,
        loadingAuto: true,
        ...highlight(provider),
        onClick: () =>
            signInWith(provider, {
                callbackURL: redirectTo,
                // Brand-new accounts start on the account page; failures come back here with ?error=.
                newUserCallbackURL: pages.account || redirectTo,
                errorCallbackURL: route.fullPath
            })
    }))
);
// A guest account (Anonymous plugin), last: the other ways sign in for good. Not for someone already a guest.
const guestButtons = computed<ButtonProps[]>(() => [
    ...(capabilities.value?.anonymous && !isGuest.value && !addingAccount.value
        ? [
              {
                  label: t('signIn.guest.button'),
                  icon: 'i-lucide-user-round',
                  loading: guest.status.value === 'pending',
                  onClick: () =>
                      guest.execute(
                          {},
                          {
                              onSuccess: async () => {
                                  await navigateTo(redirectTo);
                              }
                          }
                      )
              }
          ]
        : [])
]);
// All of them, for the form's separator ("or"), which shows only when there are some.
const providers = computed(() => [...socials.value, ...methods.value, ...ssoButtons.value, ...guestButtons.value]);

// Saved passkeys offered from the email field (conditional UI), where the browser supports it. Called on the client
// directly, not through `passkey`, so the button doesn't show as busy while the browser waits.
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
const captchaMissing = ref(false);
const error = computed(() =>
    captchaMissing.value
        ? t('captcha.required')
        : errorMessage(
              email.error.value ??
                  username.error.value ??
                  social.error.value ??
                  popupError.value ??
                  passkeyError.value ??
                  guest.error.value
          ) || oauthError.value
);

type SignedIn = { data?: { twoFactorRedirect?: boolean; twoFactorMethods?: string[] } };
const afterPassword = async (context: SignedIn) => {
    // Two-factor users have no session yet: they finish on the two-factor page, which keeps ?redirect=.
    if (context.data?.twoFactorRedirect && pages.twoFactor) {
        await navigateTo({
            path: pages.twoFactor,
            query: { ...route.query, methods: context.data.twoFactorMethods?.join(',') }
        });
        return;
    }
    await navigateTo(redirectTo);
};

async function onSubmit(event: FormSubmitEvent<{ email: string; password: string }>) {
    captchaMissing.value = captcha.missing();
    if (captchaMissing.value) return;
    const { email: identifier, password } = event.data;
    const options = { headers: captcha.headers(), onSuccess: afterPassword as (context: never) => Promise<void> };
    if (capabilities.value?.username && !identifier.includes('@')) {
        await username.execute({ username: identifier, password }, options);
    } else {
        // Better Auth's own fetch options, typed by its client; these are the same two.
        await email.execute({ email: identifier, password, callbackURL: redirectTo }, options as never);
    }
    captcha.reset();
}

async function sendLink(event: FormSubmitEvent<{ email: string }>) {
    captchaMissing.value = linkCaptcha.missing();
    if (captchaMissing.value) return;
    await magicLink.execute(
        {
            email: event.data.email,
            callbackURL: redirectTo,
            newUserCallbackURL: pages.account || redirectTo,
            // An expired or used link comes back here, with ?error=.
            errorCallbackURL: pages.signIn || '/'
        },
        { headers: linkCaptcha.headers() }
    );
    linkCaptcha.reset();
    if (magicLink.error.value) return;
    linkSentTo.value = event.data.email;
    mode.value = 'linkSent';
}

// A code by email: send it, then sign in with it. A new account, if there isn't one (unless the app turned that off).
const codeSentTo = ref('');
const sendingCode = ref(false);
const sendCodeError = ref<{ message?: string; code?: string } | null>(null);
const resent = ref(false);
const pin = ref<Array<number | undefined>>([]);
async function sendCode(to: string) {
    captchaMissing.value = codeCaptcha.missing();
    if (captchaMissing.value) return false;
    sendingCode.value = true;
    const client = useAuthClient() as unknown as EmailOtpClient;
    const { error } = await client.emailOtp.sendVerificationOtp(
        { email: to, type: 'sign-in' },
        { headers: codeCaptcha.headers() }
    );
    sendingCode.value = false;
    codeCaptcha.reset();
    sendCodeError.value = error;
    return !error;
}
async function askForCode(event: FormSubmitEvent<{ email: string }>) {
    if (!(await sendCode(event.data.email))) return;
    codeSentTo.value = event.data.email;
    pin.value = [];
    resent.value = false;
    mode.value = 'codeSent';
}
async function resendCode() {
    pin.value = [];
    resent.value = await sendCode(codeSentTo.value);
}
async function signInWithCode() {
    resent.value = false;
    await emailOtp.execute(
        { email: codeSentTo.value, otp: pin.value.join('') },
        { onSuccess: afterPassword as (context: never) => Promise<void> }
    );
    if (emailOtp.error.value) pin.value = [];
}

// A code by text (Phone Number plugin): send it, then sign in with it, or sign up (when the app allows it).
const phoneFields = computed<AuthFormField[]>(() => [
    {
        name: 'phone',
        type: 'tel',
        label: t('signIn.phone.label'),
        placeholder: t('signIn.phone.placeholder'),
        autocomplete: 'tel',
        required: true
    }
]);
/** As typed, without the spaces, dashes and brackets people write numbers with: Better Auth matches it exactly. */
const normalisePhone = (value: string) => value.replace(/[\s().-]/g, '');
const phoneSentTo = ref('');
const sendingPhone = ref(false);
const phoneSendError = ref<{ message?: string; code?: string } | null>(null);
const phoneError = ref<{ message?: string; code?: string } | null>(null);
const phonePin = ref<Array<number | undefined>>([]);
const phoneResent = ref(false);
const verifyingPhone = ref(false);
async function sendPhoneCode(to: string) {
    captchaMissing.value = phoneCaptcha.missing();
    if (captchaMissing.value) return false;
    sendingPhone.value = true;
    const client = useAuthClient() as unknown as PhoneClient;
    const { error } = await client.phoneNumber.sendOtp({ phoneNumber: to }, { headers: phoneCaptcha.headers() });
    sendingPhone.value = false;
    phoneCaptcha.reset();
    phoneSendError.value = error;
    return !error;
}
async function askForPhoneCode(event: FormSubmitEvent<{ phone: string }>) {
    const to = normalisePhone(event.data.phone);
    if (!(await sendPhoneCode(to))) return;
    phoneSentTo.value = to;
    phonePin.value = [];
    phoneError.value = null;
    phoneResent.value = false;
    mode.value = 'phoneSent';
}
async function resendPhoneCode() {
    phonePin.value = [];
    phoneError.value = null;
    phoneResent.value = await sendPhoneCode(phoneSentTo.value);
}
async function signInWithPhone() {
    phoneResent.value = false;
    verifyingPhone.value = true;
    const client = useAuthClient() as unknown as PhoneClient;
    const { data, error } = await client.phoneNumber.verify({
        phoneNumber: phoneSentTo.value,
        code: phonePin.value.join('')
    });
    verifyingPhone.value = false;
    phoneError.value = error;
    if (error) {
        phonePin.value = [];
        return;
    }
    await fetchSession({ force: true });
    await afterPassword({ data: data as SignedIn['data'] });
}
// Single sign-on (SSO plugin): a work email finds the provider by its domain; anything else is an organization's slug.
// Better Auth answers with the identity provider's address, and its client goes there.
const ssoFields = computed<AuthFormField[]>(() => [
    {
        name: 'identifier',
        type: 'text',
        label: t('signIn.sso.label'),
        placeholder: t('signIn.sso.placeholder'),
        autocomplete: 'email',
        required: true
    }
]);
type SsoClient = {
    signIn: {
        sso(input: {
            email?: string;
            organizationSlug?: string;
            callbackURL: string;
            newUserCallbackURL?: string;
            errorCallbackURL?: string;
        }): Result;
    };
};
const ssoPending = ref(false);
const ssoError = ref<{ message?: string; code?: string; status?: number } | null>(null);
// Better Auth's SSO errors have no codes: no provider for that email or slug (404), or its domain isn't verified (401).
const ssoErrorMessage = computed(() =>
    ssoError.value?.status === 404
        ? t('signIn.sso.notFound')
        : ssoError.value?.status === 401
          ? t('signIn.sso.notReady')
          : errorMessage(ssoError.value)
);
async function signInWithSso(event: FormSubmitEvent<{ identifier: string }>) {
    const identifier = event.data.identifier.trim();
    ssoPending.value = true;
    const client = useAuthClient() as unknown as SsoClient;
    const { error } = await client.signIn.sso({
        ...(identifier.includes('@') ? { email: identifier } : { organizationSlug: identifier.toLowerCase() }),
        callbackURL: redirectTo,
        newUserCallbackURL: pages.account || redirectTo,
        errorCallbackURL: route.fullPath
    });
    ssoError.value = error;
    // On success the browser is on its way to the identity provider: the button stays busy.
    if (error) ssoPending.value = false;
}

// Without sign-ups, Better Auth can't find an account for an unknown number and says it couldn't update one.
const phoneErrorMessage = computed(() =>
    phoneError.value?.code === 'FAILED_TO_UPDATE_USER' ? t('signIn.phone.noAccount') : errorMessage(phoneError.value)
);
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <!-- The link is on its way. -->
            <div v-if="mode === 'linkSent'" class="space-y-4 text-center">
                <UIcon name="i-lucide-mail-check" class="size-10 text-primary mx-auto" />
                <h1 class="text-xl font-semibold text-highlighted">{{ t('signIn.magicLink.sentTitle') }}</h1>
                <p class="text-muted">{{ t('signIn.magicLink.sentDescription', { email: linkSentTo }) }}</p>
                <UButton :label="t('common.back')" variant="subtle" color="neutral" @click="mode = 'password'" />
            </div>

            <!-- Asking for a sign-in link. -->
            <UAuthForm
                v-else-if="mode === 'link'"
                :fields="linkFields"
                :title="t('signIn.magicLink.title')"
                :description="t('signIn.magicLink.description')"
                icon="i-lucide-wand-sparkles"
                :loading="magicLink.status.value === 'pending'"
                :submit="{ label: t('signIn.magicLink.submit') }"
                @submit="sendLink"
            >
                <template #validation>
                    <Captcha
                        v-if="linkCaptcha.enabled"
                        :ref="(el) => (linkCaptcha.widget.value = el as never)"
                        v-model="linkCaptcha.token.value"
                    />
                    <UAlert
                        v-if="captchaMissing || magicLink.error.value"
                        color="error"
                        icon="i-lucide-circle-alert"
                        :title="t('signIn.magicLink.failed')"
                        :description="captchaMissing ? t('captcha.required') : errorMessage(magicLink.error.value)"
                    />
                </template>
                <template #footer>
                    <UButton
                        :label="t('signIn.magicLink.usePassword')"
                        variant="link"
                        color="neutral"
                        @click="mode = 'password'"
                    />
                </template>
            </UAuthForm>

            <!-- Asking for a code by email. -->
            <UAuthForm
                v-else-if="mode === 'code'"
                :fields="linkFields"
                :title="t('signIn.emailCode.title')"
                :description="t('signIn.emailCode.description')"
                icon="i-lucide-mail"
                :loading="sendingCode"
                :submit="{ label: t('signIn.emailCode.submit') }"
                @submit="askForCode"
            >
                <template #validation>
                    <Captcha
                        v-if="codeCaptcha.enabled"
                        :ref="(el) => (codeCaptcha.widget.value = el as never)"
                        v-model="codeCaptcha.token.value"
                    />
                    <UAlert
                        v-if="captchaMissing || sendCodeError"
                        color="error"
                        icon="i-lucide-circle-alert"
                        :title="t('signIn.emailCode.failed')"
                        :description="captchaMissing ? t('captcha.required') : errorMessage(sendCodeError)"
                    />
                </template>
                <template #footer>
                    <UButton
                        :label="t('signIn.magicLink.usePassword')"
                        variant="link"
                        color="neutral"
                        @click="mode = 'password'"
                    />
                </template>
            </UAuthForm>

            <!-- Typing the code in. -->
            <div v-else-if="mode === 'codeSent'" class="space-y-5 text-center">
                <UIcon name="i-lucide-mail-check" class="size-10 text-primary mx-auto" />
                <div class="space-y-1">
                    <h1 class="text-xl font-semibold text-highlighted">{{ t('signIn.emailCode.enterTitle') }}</h1>
                    <p class="text-muted">{{ t('signIn.emailCode.enterDescription', { email: codeSentTo }) }}</p>
                </div>
                <div class="flex justify-center">
                    <UPinInput
                        v-model="pin"
                        :length="capabilities?.emailOtp?.otpLength ?? 6"
                        type="number"
                        otp
                        autofocus
                        size="xl"
                        :disabled="emailOtp.status.value === 'pending'"
                        :aria-label="t('signIn.emailCode.codeLabel')"
                        @complete="signInWithCode"
                    />
                </div>
                <Captcha
                    v-if="codeCaptcha.enabled"
                    :ref="(el) => (codeCaptcha.widget.value = el as never)"
                    v-model="codeCaptcha.token.value"
                />
                <UAlert
                    v-if="emailOtp.error.value || sendCodeError || captchaMissing"
                    color="error"
                    icon="i-lucide-circle-alert"
                    :title="emailOtp.error.value ? t('signIn.emailCode.wrongCode') : t('signIn.emailCode.failed')"
                    :description="
                        captchaMissing ? t('captcha.required') : errorMessage(emailOtp.error.value ?? sendCodeError)
                    "
                    class="text-start"
                />
                <UAlert
                    v-else-if="resent"
                    color="success"
                    icon="i-lucide-check"
                    :title="t('signIn.emailCode.resent')"
                    class="text-start"
                />
                <div class="flex flex-wrap justify-center gap-2">
                    <UButton
                        :label="t('signIn.emailCode.resend')"
                        variant="subtle"
                        color="neutral"
                        :loading="sendingCode"
                        @click="resendCode"
                    />
                    <UButton :label="t('common.back')" variant="ghost" color="neutral" @click="mode = 'password'" />
                </div>
            </div>

            <!-- Asking for a code by text. -->
            <UAuthForm
                v-else-if="mode === 'phone'"
                :fields="phoneFields"
                :title="t('signIn.phone.title')"
                :description="t('signIn.phone.description')"
                icon="i-lucide-smartphone"
                :loading="sendingPhone"
                :submit="{ label: t('signIn.phone.submit') }"
                @submit="askForPhoneCode"
            >
                <template #validation>
                    <Captcha
                        v-if="phoneCaptcha.enabled"
                        :ref="(el) => (phoneCaptcha.widget.value = el as never)"
                        v-model="phoneCaptcha.token.value"
                    />
                    <UAlert
                        v-if="captchaMissing || phoneSendError"
                        color="error"
                        icon="i-lucide-circle-alert"
                        :title="t('signIn.phone.failed')"
                        :description="captchaMissing ? t('captcha.required') : errorMessage(phoneSendError)"
                    />
                </template>
                <template #footer>
                    <UButton
                        :label="t('signIn.magicLink.usePassword')"
                        variant="link"
                        color="neutral"
                        @click="mode = 'password'"
                    />
                </template>
            </UAuthForm>

            <!-- Single sign-on, by work email or organization. -->
            <UAuthForm
                v-else-if="mode === 'sso'"
                :fields="ssoFields"
                :title="t('signIn.sso.title')"
                :description="t('signIn.sso.description')"
                icon="i-lucide-building"
                :loading="ssoPending"
                :submit="{ label: t('signIn.sso.submit') }"
                @submit="signInWithSso"
            >
                <template #validation>
                    <UAlert
                        v-if="ssoError"
                        color="error"
                        icon="i-lucide-circle-alert"
                        :title="t('signIn.sso.failed')"
                        :description="ssoErrorMessage"
                    />
                </template>
                <template #footer>
                    <UButton
                        :label="t('signIn.magicLink.usePassword')"
                        variant="link"
                        color="neutral"
                        @click="mode = 'password'"
                    />
                </template>
            </UAuthForm>

            <!-- Typing the texted code in. -->
            <div v-else-if="mode === 'phoneSent'" class="space-y-5 text-center">
                <UIcon name="i-lucide-message-square-text" class="size-10 text-primary mx-auto" />
                <div class="space-y-1">
                    <h1 class="text-xl font-semibold text-highlighted">{{ t('signIn.emailCode.enterTitle') }}</h1>
                    <p class="text-muted">{{ t('signIn.phone.enterDescription', { phone: phoneSentTo }) }}</p>
                </div>
                <div class="flex justify-center">
                    <UPinInput
                        v-model="phonePin"
                        :length="capabilities?.phoneNumber?.otpLength ?? 6"
                        type="number"
                        otp
                        autofocus
                        size="xl"
                        :disabled="verifyingPhone"
                        :aria-label="t('signIn.emailCode.codeLabel')"
                        @complete="signInWithPhone"
                    />
                </div>
                <Captcha
                    v-if="phoneCaptcha.enabled"
                    :ref="(el) => (phoneCaptcha.widget.value = el as never)"
                    v-model="phoneCaptcha.token.value"
                />
                <UAlert
                    v-if="phoneError || phoneSendError || captchaMissing"
                    color="error"
                    icon="i-lucide-circle-alert"
                    :title="phoneError ? t('signIn.emailCode.wrongCode') : t('signIn.phone.failed')"
                    :description="
                        captchaMissing
                            ? t('captcha.required')
                            : phoneError
                              ? phoneErrorMessage
                              : errorMessage(phoneSendError)
                    "
                    class="text-start"
                />
                <UAlert
                    v-else-if="phoneResent"
                    color="success"
                    icon="i-lucide-check"
                    :title="t('signIn.emailCode.resent')"
                    class="text-start"
                />
                <div class="flex flex-wrap justify-center gap-2">
                    <UButton
                        :label="t('signIn.emailCode.resend')"
                        variant="subtle"
                        color="neutral"
                        :loading="sendingPhone"
                        @click="resendPhoneCode"
                    />
                    <UButton :label="t('common.back')" variant="ghost" color="neutral" @click="mode = 'phone'" />
                </div>
            </div>

            <UAuthForm
                v-else
                :fields="fields"
                :providers="providers"
                :title="t('signIn.title')"
                icon="i-lucide-lock"
                :loading="email.status.value === 'pending' || username.status.value === 'pending'"
                :submit="fields.length ? { label: t('signIn.submit') } : undefined"
                :ui="{ separator: 'order-1', providers: 'order-last' }"
                @submit="onSubmit"
            >
                <!-- Under the form (by the order classes above): the other ways to sign in. -->
                <template #providers>
                    <div v-if="socials.length" class="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2">
                        <UButton
                            v-for="(social, index) in socials"
                            :key="`social-${index}`"
                            color="neutral"
                            variant="subtle"
                            square
                            class="aspect-square justify-center"
                            :ui="{ leadingIcon: 'size-6' }"
                            v-bind="social"
                        />
                    </div>
                    <div v-if="methods.length || ssoButtons.length" class="grid grid-cols-2 gap-2">
                        <!-- An odd one out takes the whole row. -->
                        <UButton
                            v-for="(method, index) in methods"
                            :key="`method-${index}`"
                            block
                            color="neutral"
                            variant="subtle"
                            :class="{
                                'col-span-2': methods.length % 2 === 1 && index === methods.length - 1
                            }"
                            v-bind="method"
                        />
                        <UButton
                            v-for="(button, index) in ssoButtons"
                            :key="`sso-${index}`"
                            block
                            color="neutral"
                            variant="subtle"
                            class="col-span-2"
                            v-bind="button"
                        />
                    </div>
                    <div v-if="guestButtons.length" class="flex justify-center">
                        <UButton
                            v-for="(button, index) in guestButtons"
                            :key="`guest-${index}`"
                            color="neutral"
                            variant="link"
                            size="sm"
                            v-bind="button"
                        />
                    </div>
                </template>
                <template #description>
                    <UAlert
                        v-if="isGuest"
                        color="info"
                        variant="subtle"
                        icon="i-lucide-user-round"
                        :title="t('signIn.guest.keepTitle')"
                        :description="t('signIn.guest.keepDescription')"
                        class="mb-3 text-start"
                    />
                    <UAlert
                        v-else-if="addingAccount"
                        color="info"
                        variant="subtle"
                        icon="i-lucide-user-plus"
                        :title="t('accounts.addingTitle')"
                        :description="t('accounts.addingDescription', { name: sessionUser?.name ?? '' })"
                        class="mb-3 text-start"
                    />
                    <template v-if="pages.signUp && capabilities?.signUp">
                        {{ t('signIn.noAccount') }}
                        <ULink :to="{ path: pages.signUp, query: $route.query }" class="text-primary font-medium">{{
                            t('signIn.signUp')
                        }}</ULink
                        >.
                    </template>
                    <span v-if="lastUsedLabel" class="mt-2 flex items-center justify-center gap-1.5 text-sm">
                        <UIcon name="i-lucide-history" class="size-4" />
                        {{ t('signIn.lastUsed', { method: lastUsedLabel }) }}
                    </span>
                </template>

                <template v-if="pages.forgotPassword && capabilities?.resetPassword" #password-hint>
                    <ULink :to="pages.forgotPassword" class="text-primary font-medium" tabindex="-1">{{
                        t('signIn.forgotPassword')
                    }}</ULink>
                </template>

                <template #validation>
                    <Captcha
                        v-if="captcha.enabled"
                        :ref="(el) => (captcha.widget.value = el as never)"
                        v-model="captcha.token.value"
                    />
                    <UAlert
                        v-if="needsVerification"
                        color="warning"
                        icon="i-lucide-mail"
                        :title="t('signIn.verifyFirst.title')"
                        :description="t('signIn.verifyFirst.description')"
                    />
                    <UAlert
                        v-else-if="error"
                        color="error"
                        icon="i-lucide-circle-alert"
                        :title="t('signIn.failed')"
                        :description="error"
                    />
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
