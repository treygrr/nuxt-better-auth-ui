<script setup lang="ts">
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, ref, useAuthCapabilities, useAuthI18n, useToast } from '#imports';
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

const { t, errorMessage } = useAuthI18n();
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
            title: t('account.twoFactor.onToast'),
            description: t('account.twoFactor.onByEmail'),
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
        toast.add({ title: t('account.twoFactor.offToast'), color: 'success' });
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
    toast.add({ title: t('account.twoFactor.appSetUp'), color: 'success' });
    totpURI.value = '';
    start('codes');
    await changed();
}

function copyCodes() {
    navigator.clipboard.writeText(backupCodes.value.join('\n'));
    toast.add({ title: t('account.twoFactor.codesCopied'), color: 'success' });
}

function downloadCodes() {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`${backupCodes.value.join('\n')}\n`], { type: 'text/plain' }));
    link.download = 'backup-codes.txt';
    link.click();
    URL.revokeObjectURL(link.href);
}

const confirmLabels = computed<Partial<Record<Step, string>>>(() => ({
    'confirm-app': t('common.continue'),
    'confirm-email': t('account.twoFactor.turnOn'),
    'confirm-codes': t('account.twoFactor.makeCodes'),
    'confirm-off': t('account.twoFactor.turnOff')
}));

const description = computed(() => {
    if (!status.value?.enabled) {
        return props.required ? t('account.twoFactor.requiredDescription') : t('account.twoFactor.description');
    }
    return status.value.app ? t('account.twoFactor.onWithApp') : t('account.twoFactor.onWithEmail');
});
</script>

<template>
    <UPageCard :title="t('account.twoFactor.title')" :description="description" variant="subtle">
        <template #title><CardTitle icon="i-lucide-shield-check" :title="t('account.twoFactor.title')" /></template>
        <p v-if="!canUse" class="text-sm text-muted">{{ t('account.twoFactor.needsPassword') }}</p>

        <!-- Scanning the QR code, then confirming with a code from the app. -->
        <div v-else-if="step === 'scan'" class="space-y-4">
            <p class="text-sm">{{ t('account.twoFactor.scan') }}</p>
            <div class="flex flex-wrap items-center gap-6">
                <!-- eslint-disable-next-line vue/no-v-html -- an SVG generated here from the URI, not user HTML -->
                <div class="size-44 rounded-md overflow-hidden bg-white" v-html="qrCode" />
                <div class="space-y-2 text-sm min-w-0 flex-1">
                    <p class="text-muted">{{ t('account.twoFactor.cantScan') }}</p>
                    <code class="block break-all font-mono text-highlighted">{{ totpSecret(totpURI) }}</code>
                </div>
            </div>
            <form class="flex flex-wrap items-center gap-3" @submit.prevent="verify">
                <UPinInput
                    v-model="pin"
                    :length="6"
                    type="number"
                    otp
                    :aria-label="t('twoFactorPage.codeLabel')"
                    @complete="verify"
                />
                <UButton type="submit" :label="t('common.verify')" :loading="pending" />
                <UButton :label="t('common.cancel')" color="neutral" variant="ghost" @click="start('idle')" />
            </form>
            <p v-if="error" class="text-sm text-error">{{ errorMessage(error) }}</p>
        </div>

        <!-- New backup codes, shown once. -->
        <div v-else-if="step === 'codes'" class="space-y-4">
            <UAlert
                color="warning"
                variant="subtle"
                icon="i-lucide-life-buoy"
                :title="t('account.twoFactor.saveCodes')"
                :description="t('account.twoFactor.saveCodesDescription')"
            />
            <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-sm">
                <li v-for="code in backupCodes" :key="code" class="rounded-md bg-elevated px-3 py-1.5 text-center">
                    {{ code }}
                </li>
            </ul>
            <div class="flex flex-wrap justify-end gap-2">
                <UButton
                    :label="t('account.twoFactor.copy')"
                    icon="i-lucide-copy"
                    color="neutral"
                    variant="outline"
                    @click="copyCodes"
                />
                <UButton
                    :label="t('account.twoFactor.download')"
                    icon="i-lucide-download"
                    color="neutral"
                    variant="outline"
                    @click="downloadCodes"
                />
                <UButton :label="t('account.twoFactor.saved')" @click="start('idle')" />
            </div>
        </div>

        <!-- Confirming with the password before a change. -->
        <form v-else-if="step !== 'idle'" class="space-y-4" @submit.prevent="confirm">
            <UFormField v-if="needsPassword" :label="t('account.twoFactor.yourPassword')" required>
                <UInput
                    v-model="password"
                    type="password"
                    autocomplete="current-password"
                    required
                    autofocus
                    class="w-full"
                />
            </UFormField>
            <p v-if="step === 'confirm-codes'" class="text-sm text-muted">{{ t('account.twoFactor.oldCodesStop') }}</p>
            <p v-if="error" class="text-sm text-error">{{ errorMessage(error) }}</p>
            <div class="flex justify-end gap-2">
                <UButton :label="t('common.cancel')" color="neutral" variant="ghost" @click="start('idle')" />
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
                :label="t('account.twoFactor.useApp')"
                icon="i-lucide-smartphone"
                color="neutral"
                variant="outline"
                @click="start('confirm-app')"
            />
            <UButton
                v-else
                :label="t('account.twoFactor.newCodes')"
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="outline"
                @click="start('confirm-codes')"
            />
            <UButton
                v-if="!props.required"
                :label="t('account.twoFactor.turnOff')"
                color="error"
                variant="outline"
                @click="start('confirm-off')"
            />
        </div>

        <div v-else class="flex flex-wrap justify-end gap-2">
            <UButton
                v-if="capabilities?.twoFactor?.otp"
                :label="t('account.twoFactor.emailCodes')"
                icon="i-lucide-mail"
                color="neutral"
                variant="outline"
                @click="start('confirm-email')"
            />
            <UButton
                :label="t('account.twoFactor.setUpApp')"
                icon="i-lucide-smartphone"
                @click="start('confirm-app')"
            />
        </div>
    </UPageCard>
</template>
