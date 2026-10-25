<script setup lang="ts">
import { useAuthClientAction } from '@nuxtjs/better-auth/composables';
import { computed, useAuthCapabilities, useAuthPages, useToast } from '#imports';

import { providerInfo, sortProviders } from '../../utils/providers';
import CardTitle from './CardTitle.vue';

/** Connected sign-in methods: link another provider, or unlink one (never the last). */
type Account = { id: string; providerId: string; createdAt: string };
const props = defineProps<{ accounts: Account[] }>();
const emit = defineEmits<{ changed: [] }>();

const { capabilities } = useAuthCapabilities();
const pages = useAuthPages();
const toast = useToast();

const link = useAuthClientAction((client) => client.linkSocial);
const unlink = useAuthClientAction((client) => client.unlinkAccount);

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
    if (link.error.value)
        toast.add({ title: "Couldn't connect it", description: link.error.value.message, color: 'error' });
}

async function disconnect(account: Account) {
    // The account record's id, as Better Auth's docs say (https://better-auth.com/docs/concepts/users-accounts#account-unlinking).
    await unlink.execute({ accountId: account.id } as Parameters<typeof unlink.execute>[0]);
    if (unlink.error.value) {
        toast.add({ title: "Couldn't disconnect it", description: unlink.error.value.message, color: 'error' });
        return;
    }
    toast.add({ title: `${providerInfo(account.providerId).label} disconnected`, color: 'success' });
    emit('changed');
}
</script>

<template>
    <UPageCard title="Sign-in methods" description="The ways you can sign in to your account." variant="subtle">
        <template #title><CardTitle icon="i-lucide-log-in" title="Sign-in methods" /></template>
        <ul class="divide-y divide-default">
            <li v-for="account in connected" :key="account.id" class="flex items-center gap-3 py-3 first:pt-0">
                <UIcon :name="providerInfo(account.providerId).icon" class="size-5 shrink-0 text-muted" />
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-highlighted">{{ providerInfo(account.providerId).label }}</p>
                    <p class="text-xs text-muted">
                        Connected <NuxtTime :datetime="account.createdAt" date-style="medium" />
                    </p>
                </div>
                <UButton
                    v-if="account.providerId !== 'credential'"
                    :label="accounts.length > 1 ? 'Disconnect' : 'Your only sign-in method'"
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
                <p class="text-sm text-muted flex-1">{{ providerInfo(provider).label }}</p>
                <UButton label="Connect" size="sm" variant="subtle" loading-auto @click="connect(provider)" />
            </li>
        </ul>
    </UPageCard>
</template>
