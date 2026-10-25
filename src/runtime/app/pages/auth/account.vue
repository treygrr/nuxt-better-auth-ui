<script setup lang="ts">
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, useAuthCapabilities, useFetch, useSeoMeta } from '#imports';

import ConnectionsCard from '../../components/account/ConnectionsCard.vue';
import DeleteCard from '../../components/account/DeleteCard.vue';
import DevicesCard from '../../components/account/DevicesCard.vue';
import EmailCard from '../../components/account/EmailCard.vue';
import PasswordCard from '../../components/account/PasswordCard.vue';
import ProfileCard from '../../components/account/ProfileCard.vue';

useSeoMeta({ title: 'Your account' });

const { user, signOut } = useUserSession();
const { capabilities } = useAuthCapabilities();

// Better Auth's own GET endpoints for the signed-in user, fetched during server rendering.
const { data: accounts, refresh: refreshAccounts } = useFetch<
    Array<{ id: string; providerId: string; createdAt: string }>
>('/api/auth/list-accounts', { key: 'better-auth-ui-account-accounts', default: () => [] });
const { data: sessions, refresh: refreshSessions } = useFetch<
    Array<{
        id: string;
        token: string;
        ipAddress?: string | null;
        userAgent?: string | null;
        updatedAt: string;
        createdAt: string;
    }>
>('/api/auth/list-sessions', { key: 'better-auth-ui-account-sessions', default: () => [] });

const hasPassword = computed(() => accounts.value.some((account) => account.providerId === 'credential'));
const showConnections = computed(
    () =>
        (capabilities.value?.socialProviders.length ?? 0) > 0 ||
        accounts.value.some((account) => account.providerId !== 'credential')
);
</script>

<template>
    <UContainer class="py-12">
        <div class="w-full max-w-2xl mx-auto space-y-6">
            <div class="flex items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-semibold text-highlighted">Your account</h1>
                    <p class="text-muted">{{ user?.email }}</p>
                </div>
                <UButton
                    label="Sign out"
                    icon="i-lucide-log-out"
                    color="neutral"
                    variant="outline"
                    @click="signOut()"
                />
            </div>

            <ProfileCard />
            <EmailCard />
            <PasswordCard
                v-if="capabilities?.emailAndPassword"
                :has-password="hasPassword"
                @changed="refreshSessions()"
            />
            <ConnectionsCard v-if="showConnections" :accounts="accounts" @changed="refreshAccounts()" />
            <DevicesCard :sessions="sessions" @changed="refreshSessions()" />
            <DeleteCard v-if="capabilities?.deleteUser" :has-password="hasPassword" />
        </div>
    </UContainer>
</template>
