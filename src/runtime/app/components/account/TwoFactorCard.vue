<script setup lang="ts">
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, ref, useAuthCapabilities, useToast } from '#imports';
import { renderSVG } from 'uqr';

import { useAccountTwoFactor } from '../../utils/account-data';
import CardTitle from './CardTitle.vue';
import { totpSecret, useTwoFactorAction } from '../../utils/two-factor';

/**
 * Two-factor authentication through Better Auth's Two-Factor plugin: an authenticator app (with backup codes),
 * or codes by email when the app sends them. It's asked for after signing in. Users who must have it can't turn it off.
 */
const props = defineProps<{ hasPassword: boolean; required?: boolean }>();
const emit = defineEmits<{ changed: [] }>();

const { fetchSession } = useUserSession();
const { capabilities } = useAuthCapabilities();
const toast = useToast();

const { data: status, refresh } = useAccountTwoFactor();

const enable = useTwoFactorAction('enable');
const verifyTotp = useTwoFactorAction('verifyTotp');
const disable = useTwoFactorAction('disable');
const generateBackupCodes = useTwoFactorAction('generateBackupCodes');

// Better Auth asks for the password to change two-factor, unless the app allows passwordless accounts to.
const needsPassword = computed(() => props.hasPassword || !capabilities.value?.twoFactor?.allowPasswordless);
const canUse = computed(() => props.hasPassword || capabilities.value?.twoFactor?.allowPasswordless);

type Step = 'idle' | 'confirm-app' | 'confirm-email' | 'confirm-codes' | 'confirm-off' | 'scan' | 'codes';
const step = ref<Step>('idle');
const password = ref('');
const totpURI = ref('');
const backupCodes = ref<string[]>([]);
const pin = ref<Array<number | undefined>>([]);

// Only rendered after setting up starts, in the browser: the URI holds the secret, so it's never sent elsewhere.
const qrCode = computed(() => (totpURI.value ? renderSVG(totpURI.value, { border: 1 }) : ''));

const pending = computed(() =>
    [enable, verifyTotp, disable, generateBackupCodes].some((action) => action.status.value === 'pending')
);
const error = computed(
    () => enable.error.value ?? verifyTotp.error.value ?? disable.error.value ?? generateBackupCodes.error.value ?? null
);

function start(next: Step) {
    step.value = next;
    password.value = '';
    pin.value = [];
}

// Two-factor changes replace the session (Better Auth signs it in again), so the session and devices refresh.
async function changed() {
    await Promise.all([fetchSession({ force: true }), refresh()]);
    emit('changed');
}

async function confirm() {
    const input = needsPassword.value ? { password: password.value } : {};
    if (step.value === 'confirm-app') {
        await enable.execute({ ...input, method: 'totp' });
        const result = enable.data.value?.data;
        if (!result || result.method !== 'totp') return;
        totpURI.value = result.totpURI;
        backupCodes.value = result.backupCodes;
        start('scan');
    } else if (step.value === 'confirm-email') {
        await enable.execute({ ...input, method: 'otp' });
        if (enable.error.value) return;
        toast.add({
            title: 'Two-factor is on',
            description: "We'll email you a code when you sign in.",
            color: 'success'
        });
        start('idle');
        await changed();
    } else if (step.value === 'confirm-codes') {
        await generateBackupCodes.execute(input);
        const result = generateBackupCodes.data.value?.data;
        if (!result) return;
        backupCodes.value = result.backupCodes;
        start('codes');
    } else if (step.value === 'confirm-off') {
        await disable.execute(input);
        if (disable.error.value) return;
        toast.add({ title: 'Two-factor is off', color: 'success' });
        start('idle');
        await changed();
    }
}

async function verify() {
    await verifyTotp.execute({ code: pin.value.join('') });
    if (verifyTotp.error.value) {
        pin.value = [];
        return;
    }
    toast.add({ title: 'Authenticator app set up', color: 'success' });
    totpURI.value = '';
    start('codes');
    await changed();
}

function copyCodes() {
    navigator.clipboard.writeText(backupCodes.value.join('\n'));
    toast.add({ title: 'Backup codes copied', color: 'success' });
}

function downloadCodes() {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`${backupCodes.value.join('\n')}\n`], { type: 'text/plain' }));
    link.download = 'backup-codes.txt';
    link.click();
    URL.revokeObjectURL(link.href);
}

const confirmLabels: Partial<Record<Step, string>> = {
    'confirm-app': 'Continue',
    'confirm-email': 'Turn on',
    'confirm-codes': 'Make new codes',
    'confirm-off': 'Turn off'
};

const description = computed(() => {
    if (!status.value?.enabled) {
        return props.required
            ? 'Your account requires a code as well when you sign in.'
            : 'Ask for a code as well when you sign in.';
    }
    return status.value.app
        ? 'On: you sign in with a code from your authenticator app.'
        : 'On: we email you a code when you sign in.';
});
</script>

<template>
    <UPageCard title="Two-factor authentication" :description="description" variant="subtle">
        <template #title><CardTitle icon="i-lucide-shield-check" title="Two-factor authentication" /></template>
        <p v-if="!canUse" class="text-sm text-muted">Set a password first to turn on two-factor.</p>

        <!-- Scanning the QR code, then confirming with a code from the app. -->
        <div v-else-if="step === 'scan'" class="space-y-4">
            <p class="text-sm">
                Scan this with your authenticator app (Google Authenticator, 1Password, Authy, …), then enter the
                6-digit code it shows.
            </p>
            <div class="flex flex-wrap items-center gap-6">
                <!-- eslint-disable-next-line vue/no-v-html -- an SVG generated here from the URI, not user HTML -->
                <div class="size-44 rounded-md overflow-hidden bg-white" v-html="qrCode" />
                <div class="space-y-2 text-sm min-w-0 flex-1">
                    <p class="text-muted">Can't scan it? Enter this key instead:</p>
                    <code class="block break-all font-mono text-highlighted">{{ totpSecret(totpURI) }}</code>
                </div>
            </div>
            <form class="flex flex-wrap items-center gap-3" @submit.prevent="verify">
                <UPinInput v-model="pin" :length="6" type="number" otp aria-label="Code" @complete="verify" />
                <UButton type="submit" label="Verify" :loading="pending" />
                <UButton label="Cancel" color="neutral" variant="ghost" @click="start('idle')" />
            </form>
        </div>

        <!-- New backup codes, shown once. -->
        <div v-else-if="step === 'codes'" class="space-y-4">
            <UAlert
                color="warning"
                variant="subtle"
                icon="i-lucide-life-buoy"
                title="Save your backup codes"
                description="Each one signs you in once if you lose your authenticator app. They won't be shown again."
            />
            <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-sm">
                <li v-for="code in backupCodes" :key="code" class="rounded-md bg-elevated px-3 py-1.5 text-center">
                    {{ code }}
                </li>
            </ul>
            <div class="flex flex-wrap justify-end gap-2">
                <UButton label="Copy" icon="i-lucide-copy" color="neutral" variant="outline" @click="copyCodes" />
                <UButton
                    label="Download"
                    icon="i-lucide-download"
                    color="neutral"
                    variant="outline"
                    @click="downloadCodes"
                />
                <UButton label="I've saved them" @click="start('idle')" />
            </div>
        </div>

        <!-- Confirming with the password before a change. -->
        <form v-else-if="step !== 'idle'" class="space-y-4" @submit.prevent="confirm">
            <UFormField v-if="needsPassword" label="Your password" required>
                <UInput
                    v-model="password"
                    type="password"
                    autocomplete="current-password"
                    required
                    autofocus
                    class="w-full"
                />
            </UFormField>
            <p v-if="step === 'confirm-codes'" class="text-sm text-muted">
                Your current backup codes will stop working.
            </p>
            <p v-if="error" class="text-sm text-error">{{ error.message }}</p>
            <div class="flex justify-end gap-2">
                <UButton label="Cancel" color="neutral" variant="ghost" @click="start('idle')" />
                <UButton
                    type="submit"
                    :label="confirmLabels[step]"
                    :color="step === 'confirm-off' ? 'error' : 'primary'"
                    :loading="pending"
                />
            </div>
        </form>

        <div v-else-if="status?.enabled" class="flex flex-wrap justify-end gap-2">
            <UButton
                v-if="!status.app"
                label="Use an authenticator app"
                icon="i-lucide-smartphone"
                color="neutral"
                variant="outline"
                @click="start('confirm-app')"
            />
            <UButton
                v-else
                label="New backup codes"
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="outline"
                @click="start('confirm-codes')"
            />
            <UButton
                v-if="!props.required"
                label="Turn off"
                color="error"
                variant="outline"
                @click="start('confirm-off')"
            />
        </div>

        <div v-else class="flex flex-wrap justify-end gap-2">
            <UButton
                v-if="capabilities?.twoFactor?.otp"
                label="Email me codes"
                icon="i-lucide-mail"
                color="neutral"
                variant="outline"
                @click="start('confirm-email')"
            />
            <UButton label="Set up an authenticator app" icon="i-lucide-smartphone" @click="start('confirm-app')" />
        </div>
    </UPageCard>
</template>
