<script setup lang="ts">
import { useAuthClient } from '@nuxtjs/better-auth/composables';
import {
    computed,
    navigateTo,
    ref,
    useAsyncData,
    useAuthI18n,
    useRequestFetch,
    useRoute,
    useRuntimeConfig,
    useSeoMeta
} from '#imports';

/**
 * Better Auth's Device Authorization (the OAuth device grant): a TV, console or CLI shows a code, and the signed-in
 * user enters it here, sees which app is asking, and approves or denies it. As RFC 8628 asks, nothing is approved
 * without an explicit choice, and the page warns against codes sent by someone else.
 */
const { t } = useAuthI18n();
useSeoMeta({ title: () => t('device.title') });

const route = useRoute();
const { deviceClients } = useRuntimeConfig().public.betterAuthUi as { deviceClients: Record<string, string> };

// From the device's link (verification_uri_complete) or the form.
const code = computed(() => (typeof route.query.user_code === 'string' ? route.query.user_code.trim() : ''));
const typed = ref(code.value);

type DeviceRequest = {
    user_code: string;
    status: 'pending' | 'approved' | 'denied';
    client_id?: string;
    scope?: string;
};
type DeviceError = { error?: string; error_description?: string };

// Better Auth's GET /device checks the code and claims it for this session, so only this account can approve it.
// Server-rendered, with the visitor's cookies.
const requestFetch = useRequestFetch();
const {
    data: request,
    error,
    refresh
} = await useAsyncData(
    () => `better-auth-ui-device-${code.value}`,
    () =>
        code.value
            ? requestFetch<DeviceRequest>('/api/auth/device', { query: { user_code: code.value } })
            : Promise.resolve(null)
);

/** Better Auth's device errors, in the visitor's words. */
const describe = (problem: DeviceError | null | undefined) => {
    if (!problem) return null;
    if (problem.error === 'expired_token') return t('device.errors.expired');
    if (problem.error === 'access_denied') return t('device.errors.otherAccount');
    if (problem.error === 'invalid_request') {
        return /already processed/i.test(problem.error_description ?? '')
            ? t('device.errors.used')
            : t('device.errors.invalid');
    }
    return t('device.errors.failed');
};

const outcome = ref<'approved' | 'denied' | null>(null);
const actionError = ref<DeviceError | null>(null);
const problem = computed(() => {
    if (actionError.value) return describe(actionError.value);
    if (error.value) return describe((error.value as { data?: DeviceError }).data ?? {});
    if (!request.value) return null;
    if (request.value.status !== 'pending') return t('device.errors.used');
    // Claimed by another session: Better Auth leaves out who's asking.
    if (!request.value.client_id) return t('device.errors.otherAccount');
    return null;
});
const reviewing = computed(() => !!request.value && !problem.value && !outcome.value);
const appName = computed(() => {
    const id = request.value?.client_id ?? '';
    return deviceClients[id] ?? id;
});
const scopes = computed(() => request.value?.scope?.split(' ').filter(Boolean) ?? []);

async function lookUp() {
    outcome.value = null;
    actionError.value = null;
    // The same code again (eg after a network error) asks again; a new one changes the address, which asks.
    if (typed.value.trim() === code.value) await refresh();
    else await navigateTo({ query: { ...route.query, user_code: typed.value.trim() } });
}
function startOver() {
    typed.value = '';
    return lookUp();
}

type DeviceClient = {
    device: {
        approve(input: { userCode: string }): Promise<{ error: DeviceError | null }>;
        deny(input: { userCode: string }): Promise<{ error: DeviceError | null }>;
    };
};
async function decide(choice: 'approve' | 'deny') {
    const client = useAuthClient() as unknown as DeviceClient;
    const { error: failed } = await client.device[choice]({ userCode: code.value });
    actionError.value = failed;
    if (!failed) outcome.value = choice === 'approve' ? 'approved' : 'denied';
}
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <!-- Done. -->
            <div v-if="outcome" class="space-y-4 text-center">
                <UIcon
                    :name="outcome === 'approved' ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
                    class="size-10 mx-auto"
                    :class="outcome === 'approved' ? 'text-success' : 'text-muted'"
                />
                <h1 class="text-xl font-semibold text-highlighted">
                    {{ outcome === 'approved' ? t('device.approvedTitle') : t('device.deniedTitle') }}
                </h1>
                <p class="text-muted">
                    {{ outcome === 'approved' ? t('device.approvedDescription') : t('device.deniedDescription') }}
                </p>
                <UButton :label="t('device.anotherCode')" color="neutral" variant="subtle" @click="startOver" />
            </div>

            <!-- Which app is asking, and for what. -->
            <div v-else-if="reviewing" class="space-y-5">
                <div class="space-y-1 text-center">
                    <UIcon name="i-lucide-tv" class="size-10 text-primary mx-auto" />
                    <h1 class="text-xl font-semibold text-highlighted">{{ t('device.reviewTitle') }}</h1>
                    <p class="text-muted">{{ t('device.reviewDescription', { app: appName }) }}</p>
                </div>
                <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                    <dt class="text-muted">{{ t('device.app') }}</dt>
                    <dd class="font-medium text-highlighted">{{ appName }}</dd>
                    <dt class="text-muted">{{ t('device.access') }}</dt>
                    <dd class="flex flex-wrap gap-1">
                        <UBadge v-for="scope in scopes" :key="scope" :label="scope" color="neutral" variant="subtle" />
                        <span v-if="!scopes.length">{{ t('device.fullAccess') }}</span>
                    </dd>
                    <dt class="text-muted">{{ t('device.code') }}</dt>
                    <dd class="font-mono font-medium text-highlighted tracking-widest">{{ code.toUpperCase() }}</dd>
                </dl>
                <UAlert
                    color="warning"
                    variant="subtle"
                    icon="i-lucide-shield-alert"
                    :description="t('device.warning')"
                />
                <div class="flex flex-wrap justify-end gap-2">
                    <UButton
                        :label="t('device.anotherCode')"
                        color="neutral"
                        variant="ghost"
                        class="me-auto"
                        @click="startOver"
                    />
                    <UButton
                        :label="t('device.deny')"
                        color="neutral"
                        variant="outline"
                        loading-auto
                        @click="decide('deny')"
                    />
                    <UButton :label="t('device.approve')" loading-auto @click="decide('approve')" />
                </div>
            </div>

            <!-- Entering the code. -->
            <UForm v-else :state="{ typed }" class="space-y-5" @submit="lookUp">
                <div class="space-y-1 text-center">
                    <UIcon name="i-lucide-tv" class="size-10 text-primary mx-auto" />
                    <h1 class="text-xl font-semibold text-highlighted">{{ t('device.title') }}</h1>
                    <p class="text-muted">{{ t('device.description') }}</p>
                </div>
                <UFormField :label="t('device.codeLabel')" name="typed" required>
                    <UInput
                        v-model="typed"
                        placeholder="ABCD-1234"
                        autocomplete="one-time-code"
                        autocapitalize="characters"
                        spellcheck="false"
                        autofocus
                        size="xl"
                        class="w-full"
                        :ui="{ base: 'font-mono uppercase tracking-widest text-center' }"
                    />
                </UFormField>
                <UAlert v-if="problem" color="error" icon="i-lucide-circle-alert" :description="problem" />
                <UButton type="submit" :label="t('device.submit')" block :disabled="!typed.trim()" />
            </UForm>
        </UPageCard>
    </UContainer>
</template>
