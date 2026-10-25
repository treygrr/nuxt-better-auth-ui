<script setup lang="ts">
import { useAuthClient, useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, ref, useAuthCapabilities, useAuthI18n, useToast } from '#imports';

import Captcha from '../auth/Captcha.vue';
import { useCaptcha } from '../../utils/captcha';
import CardTitle from './CardTitle.vue';

/**
 * The phone number (Better Auth's Phone Number plugin): add or change it with a code by text (its verify with
 * `updatePhoneNumber`), or remove it (`updateUser({ phoneNumber: null })`, as Better Auth documents).
 */
const { t, errorMessage } = useAuthI18n();
const toast = useToast();
const { capabilities } = useAuthCapabilities();
const { user, fetchSession } = useUserSession();

type PhoneUser = { email: string; phoneNumber?: string | null; phoneNumberVerified?: boolean | null };
const current = computed(() => user.value as unknown as PhoneUser | null);
// Accounts that signed up by text have a generated email: their number is how they sign in, so it stays.
const removable = computed(() => !current.value?.email.endsWith('.invalid'));

type Result = Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
type PhoneClient = {
    phoneNumber: {
        sendOtp(input: { phoneNumber: string }, options?: { headers?: Record<string, string> }): Result;
        verify(input: { phoneNumber: string; code: string; updatePhoneNumber: true }): Result;
    };
    updateUser(input: { phoneNumber: null }): Result;
};
const client = () => useAuthClient() as unknown as PhoneClient;

const step = ref<'view' | 'number' | 'code'>('view');
const number = ref('');
const sentTo = ref('');
const pin = ref<Array<number | undefined>>([]);
const busy = ref(false);
const captcha = useCaptcha('/phone-number/send-otp');
const captchaMissing = ref(false);

const fail = (error: { message?: string; code?: string } | null) =>
    toast.add({ title: t('account.phone.failed'), description: errorMessage(error), color: 'error' });

async function send() {
    captchaMissing.value = captcha.missing();
    if (captchaMissing.value) return;
    const to = number.value.replace(/[\s().-]/g, '');
    busy.value = true;
    const { error } = await client().phoneNumber.sendOtp({ phoneNumber: to }, { headers: captcha.headers() });
    busy.value = false;
    captcha.reset();
    if (error) return fail(error);
    sentTo.value = to;
    pin.value = [];
    step.value = 'code';
}
async function verify() {
    busy.value = true;
    const { error } = await client().phoneNumber.verify({
        phoneNumber: sentTo.value,
        code: pin.value.join(''),
        updatePhoneNumber: true
    });
    busy.value = false;
    if (error) {
        pin.value = [];
        return fail(error);
    }
    await fetchSession({ force: true });
    toast.add({ title: t('account.phone.saved'), color: 'success' });
    step.value = 'view';
}
async function remove() {
    const { error } = await client().updateUser({ phoneNumber: null });
    if (error) return fail(error);
    await fetchSession({ force: true });
    toast.add({ title: t('account.phone.removed'), color: 'success' });
}
function start() {
    number.value = '';
    step.value = 'number';
}
</script>

<template>
    <UPageCard :title="t('account.phone.title')" :description="t('account.phone.description')" variant="subtle">
        <template #title><CardTitle icon="i-lucide-smartphone" :title="t('account.phone.title')" /></template>

        <!-- The number they have, if any. -->
        <div v-if="step === 'view'" class="flex flex-wrap items-center gap-3">
            <template v-if="current?.phoneNumber">
                <UIcon name="i-lucide-smartphone" class="size-5 shrink-0 text-muted" />
                <span class="font-medium text-highlighted">{{ current.phoneNumber }}</span>
                <UBadge
                    :label="current.phoneNumberVerified ? t('account.phone.verified') : t('account.phone.unverified')"
                    :color="current.phoneNumberVerified ? 'success' : 'warning'"
                    variant="subtle"
                />
                <div class="ms-auto flex gap-2">
                    <UButton :label="t('account.phone.change')" color="neutral" variant="outline" @click="start" />
                    <UButton
                        v-if="removable"
                        :label="t('account.phone.remove')"
                        color="error"
                        variant="ghost"
                        loading-auto
                        @click="remove"
                    />
                </div>
            </template>
            <template v-else>
                <p class="text-sm text-muted flex-1">{{ t('account.phone.none') }}</p>
                <UButton :label="t('account.phone.add')" icon="i-lucide-plus" @click="start" />
            </template>
        </div>

        <!-- The new number. -->
        <form v-else-if="step === 'number'" class="space-y-3" @submit.prevent="send">
            <div class="flex flex-wrap items-start gap-3">
                <UInput
                    v-model="number"
                    type="tel"
                    autocomplete="tel"
                    :placeholder="t('account.phone.placeholder')"
                    :aria-label="t('account.phone.label')"
                    required
                    autofocus
                    class="flex-1 min-w-48"
                />
                <UButton type="submit" :label="t('account.phone.send')" :loading="busy" />
                <UButton :label="t('common.cancel')" color="neutral" variant="ghost" @click="step = 'view'" />
            </div>
            <Captcha
                v-if="captcha.enabled"
                :ref="(el) => (captcha.widget.value = el as never)"
                v-model="captcha.token.value"
            />
            <p v-if="captchaMissing" class="text-sm text-error">{{ t('captcha.required') }}</p>
        </form>

        <!-- The code we texted it. -->
        <div v-else class="space-y-3">
            <p class="text-sm text-muted">{{ t('account.phone.enterDescription', { phone: sentTo }) }}</p>
            <div class="flex flex-wrap items-center gap-3">
                <UPinInput
                    v-model="pin"
                    :length="capabilities?.phoneNumber?.otpLength ?? 6"
                    type="number"
                    otp
                    autofocus
                    :disabled="busy"
                    :aria-label="t('account.phone.codeLabel')"
                    @complete="verify"
                />
                <UButton :label="t('common.back')" color="neutral" variant="ghost" @click="step = 'number'" />
            </div>
        </div>
    </UPageCard>
</template>
