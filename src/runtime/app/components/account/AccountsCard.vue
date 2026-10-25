<script setup lang="ts">
import { useAuthCapabilities, useAuthI18n } from '#imports';

import { useDeviceAccounts } from '../../composables/useDeviceAccounts';
import CardTitle from './CardTitle.vue';

/** The accounts signed in on this browser (Multi Session plugin): switch to one, sign one out, add another. */
const { t } = useAuthI18n();
const { capabilities } = useAuthCapabilities();
const { accounts, switchTo, signOutOf, addAccountLink } = useDeviceAccounts();
</script>

<template>
    <UPageCard
        :title="t('accounts.title')"
        :description="t('accounts.description', { count: capabilities?.multiSession?.maximumSessions ?? 5 })"
        variant="subtle"
    >
        <template #title><CardTitle icon="i-lucide-users-round" :title="t('accounts.title')" /></template>
        <template v-if="addAccountLink" #footer>
            <UButton
                :label="t('accounts.add')"
                icon="i-lucide-user-plus"
                color="neutral"
                variant="outline"
                :to="addAccountLink"
            />
        </template>
        <ul class="divide-y divide-default">
            <li
                v-for="account in accounts"
                :key="account.token"
                class="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
                <UAvatar :src="account.user.image ?? undefined" :alt="account.user.name" size="md" />
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-highlighted truncate">
                        {{ account.user.name }}
                        <UBadge
                            v-if="account.current"
                            :label="t('accounts.current')"
                            color="primary"
                            variant="subtle"
                            size="sm"
                            class="ms-1"
                        />
                    </p>
                    <p class="text-xs text-muted truncate">{{ account.user.email }}</p>
                </div>
                <div class="flex gap-2">
                    <UButton
                        v-if="!account.current"
                        :label="t('accounts.switch')"
                        color="neutral"
                        variant="outline"
                        size="sm"
                        loading-auto
                        @click="switchTo(account)"
                    />
                    <UButton
                        :label="t('accounts.signOutOne')"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        loading-auto
                        @click="signOutOf(account)"
                    />
                </div>
            </li>
        </ul>
    </UPageCard>
</template>
