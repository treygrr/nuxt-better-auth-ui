<script setup lang="ts">
import { useAuthClientAction } from '@nuxtjs/better-auth/composables';
import { computed, useAuthCapabilities, useAuthI18n, useAuthPages, useToast } from '#imports';

import { providerInfo, sortProviders } from '../../utils/providers';
import CardTitle from './CardTitle.vue';

/** Connected sign-in methods: link another provider, or unlink one (never the last). */
type Account = { id: string; providerId: string; createdAt: string };
const props = defineProps<{ accounts: Account[] }>();
const emit = defineEmits<{ changed: [] }>();

const { t, errorMessage, locale } = useAuthI18n();
const { capabilities } = useAuthCapabilities();
const pages = useAuthPages();
const toast = useToast();

const link = useAuthClientAction((client) => client.linkSocial);
const unlink = useAuthClientAction((client) => client.unlinkAccount);

// Providers keep their own names; "email and password" is in the visitor's language.
const label = (providerId: string) =>
    providerId === 'credential' ? t('account.methods.password') : providerInfo(providerId).label;

// Password first, then providers alphabetically.
const connected = computed(() =>
    [...props.accounts].sort(
        (a, b) =>
            sortProviders(props.accounts.map((account) => account.providerId)).indexOf(a.providerId) -
            sortProviders(props.accounts.map((account) => account.providerId)).indexOf(b.providerId)
    )
);
const available = computed(() =>
    (capabilities.value?.socialProviders ?? []).filter(
        (id) => !props.accounts.some((account) => account.providerId === id)
    )
);

async function connect(provider: string) {
    // Leaves for the provider and comes back here.
    await link.execute({ provider, callbackURL: pages.account || '/' } as Parameters<typeof link.execute>[0]);
    if (link.error.value) {
        toast.add({
            title: t('account.methods.connectFailed'),
            description: errorMessage(link.error.value),
            color: 'error'
        });
    }
}

async function disconnect(account: Account) {
    // The account record's id, as Better Auth's docs say (https://better-auth.com/docs/concepts/users-accounts#account-unlinking).
    await unlink.execute({ accountId: account.id } as Parameters<typeof unlink.execute>[0]);
    if (unlink.error.value) {
        toast.add({
            title: t('account.methods.disconnectFailed'),
            description: errorMessage(unlink.error.value),
            color: 'error'
        });
        return;
    }
    toast.add({ title: t('account.methods.disconnected', { provider: label(account.providerId) }), color: 'success' });
    emit('changed');
}
</script>

<template>
    <UPageCard :title="t('account.methods.title')" :description="t('account.methods.description')" variant="subtle">
        <template #title><CardTitle icon="i-lucide-log-in" :title="t('account.methods.title')" /></template>
        <ul class="divide-y divide-default">
            <li v-for="account in connected" :key="account.id" class="flex items-center gap-3 py-3 first:pt-0">
                <UIcon :name="providerInfo(account.providerId).icon" class="size-5 shrink-0 text-muted" />
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-highlighted">{{ label(account.providerId) }}</p>
                    <p class="text-xs text-muted">
                        {{ t('account.methods.connectedOn') }}
                        <NuxtTime :datetime="account.createdAt" date-style="medium" :locale="locale" />
                    </p>
                </div>
                <UButton
                    v-if="account.providerId !== 'credential'"
                    :label="accounts.length > 1 ? t('account.methods.disconnect') : t('account.methods.onlyOne')"
                    :disabled="accounts.length <= 1"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    loading-auto
                    @click="disconnect(account)"
                />
            </li>
            <li v-for="provider in available" :key="provider" class="flex items-center gap-3 py-3 last:pb-0">
                <UIcon :name="providerInfo(provider).icon" class="size-5 shrink-0 text-dimmed" />
                <p class="text-sm text-muted flex-1">{{ label(provider) }}</p>
                <UButton
                    :label="t('account.methods.connect')"
                    size="sm"
                    variant="subtle"
                    loading-auto
                    @click="connect(provider)"
                />
            </li>
        </ul>
    </UPageCard>
</template>
