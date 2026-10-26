<script setup lang="ts">
import { useUserSession } from '@nuxtjs/better-auth/composables';
import {
    computed,
    navigateTo,
    ref,
    useAuthI18n,
    useAuthPages,
    useAuthRedirectTarget,
    useRoute,
    useSeoMeta
} from '#imports';

import { useTwoFactorAction } from '../../utils/two-factor';

/**
 * The second step of signing in with a password, for users with two-factor on: a code from their authenticator
 * app, by email, or a backup code. Better Auth keeps the half-finished sign-in in a cookie for a few minutes.
 */
const { t, errorMessage } = useAuthI18n();
useSeoMeta({ title: () => t('twoFactorPage.title') });

const pages = useAuthPages();
const redirectTo = useAuthRedirectTarget();
const route = useRoute();
const { fetchSession } = useUserSession();

// The methods Better Auth offered this user at sign-in (?methods=totp,otp).
const methods = computed(() =>
    typeof route.query.methods === 'string' ? route.query.methods.split(',').filter(Boolean) : []
);
type Mode = 'totp' | 'otp' | 'backup';
const mode = ref<Mode>(methods.value.includes('totp') || !methods.value.includes('otp') ? 'totp' : 'otp');

const verifyTotp = useTwoFactorAction('verifyTotp');
const verifyOtp = useTwoFactorAction('verifyOtp');
const verifyBackupCode = useTwoFactorAction('verifyBackupCode');
const sendOtp = useTwoFactorAction('sendOtp');
const actions = { totp: verifyTotp, otp: verifyOtp, backup: verifyBackupCode };
const action = computed(() => actions[mode.value]);

const pin = ref<Array<number | undefined>>([]);
const backupCode = ref('');
const trustDevice = ref(false);
const otpSent = ref(false);

const error = computed(() => action.value.error.value ?? (mode.value === 'otp' ? sendOtp.error.value : null));
// An expired or missing sign-in (the cookie lasts minutes) can only be fixed by signing in again.
const expired = computed(() => error.value?.code === 'INVALID_TWO_FACTOR_COOKIE');

function choose(next: Mode) {
    mode.value = next;
    pin.value = [];
    backupCode.value = '';
}

async function send() {
    await sendOtp.execute();
    if (!sendOtp.error.value) otpSent.value = true;
}

async function verify() {
    const code = mode.value === 'backup' ? backupCode.value.trim() : pin.value.join('');
    if (!code) return;
    await action.value.execute({ code, trustDevice: trustDevice.value });
    if (action.value.error.value) {
        pin.value = [];
        return;
    }
    await fetchSession({ force: true });
    await navigateTo(redirectTo);
}

const titles = computed<Record<Mode, { title: string; description: string; icon: string }>>(() => ({
    totp: {
        title: t('twoFactorPage.totp.title'),
        description: t('twoFactorPage.totp.description'),
        icon: 'i-lucide-smartphone'
    },
    otp: {
        title: t('twoFactorPage.otp.title'),
        description: t('twoFactorPage.otp.description'),
        icon: 'i-lucide-mail'
    },
    backup: {
        title: t('twoFactorPage.backup.title'),
        description: t('twoFactorPage.backup.description'),
        icon: 'i-lucide-life-buoy'
    }
}));
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <form class="space-y-6" @submit.prevent="verify">
                <div class="text-center space-y-2">
                    <UIcon :name="titles[mode].icon" class="size-8 text-primary mx-auto" />
                    <h1 class="text-xl font-semibold text-highlighted">{{ titles[mode].title }}</h1>
                    <p class="text-muted text-sm">{{ titles[mode].description }}</p>
                </div>

                <div v-if="mode === 'otp' && !otpSent" class="flex justify-center">
                    <UButton
                        :label="t('twoFactorPage.otp.send')"
                        icon="i-lucide-send"
                        :loading="sendOtp.status.value === 'pending'"
                        @click="send"
                    />
                </div>
                <div v-else-if="mode === 'backup'">
                    <UInput
                        v-model="backupCode"
                        placeholder="xxxxx-xxxxx"
                        autocomplete="one-time-code"
                        :aria-label="t('twoFactorPage.backup.label')"
                        autofocus
                        class="w-full"
                    />
                </div>
                <div v-else class="flex justify-center">
                    <UPinInput
                        v-model="pin"
                        :length="6"
                        type="number"
                        otp
                        autofocus
                        size="xl"
                        :aria-label="t('twoFactorPage.codeLabel')"
                        @complete="verify"
                    />
                </div>

                <UCheckbox
                    v-model="trustDevice"
                    :label="t('twoFactorPage.trust.label')"
                    :description="t('twoFactorPage.trust.description')"
                />

                <UAlert
                    v-if="error"
                    color="error"
                    icon="i-lucide-circle-alert"
                    :title="expired ? t('twoFactorPage.expired.title') : t('twoFactorPage.failed')"
                    :description="expired ? t('twoFactorPage.expired.description') : errorMessage(error)"
                />

                <UButton
                    v-if="!(mode === 'otp' && !otpSent)"
                    type="submit"
                    :label="t('common.verify')"
                    block
                    :loading="action.status.value === 'pending'"
                />

                <div class="flex flex-col items-center gap-1 text-sm">
                    <UButton
                        v-if="mode !== 'totp' && methods.includes('totp')"
                        :label="t('twoFactorPage.useApp')"
                        variant="link"
                        color="neutral"
                        @click="choose('totp')"
                    />
                    <UButton
                        v-if="mode !== 'otp' && methods.includes('otp')"
                        :label="t('twoFactorPage.useEmail')"
                        variant="link"
                        color="neutral"
                        @click="choose('otp')"
                    />
                    <UButton
                        v-if="mode !== 'backup' && methods.includes('totp')"
                        :label="t('twoFactorPage.useBackup')"
                        variant="link"
                        color="neutral"
                        @click="choose('backup')"
                    />
                    <ULink
                        v-if="pages.signIn"
                        :to="{ path: pages.signIn, query: { ...$route.query, methods: undefined } }"
                        class="text-muted"
                        >{{ t('common.backToSignIn') }}</ULink
                    >
                </div>
            </form>
        </UPageCard>
    </UContainer>
</template>
