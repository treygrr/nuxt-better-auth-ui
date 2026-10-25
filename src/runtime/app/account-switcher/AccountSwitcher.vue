<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, navigateTo, useAuthCapabilities, useAuthI18n } from '#imports';

import { useSignOutTarget } from '../composables/useAuthPages';
import { useDeviceAccounts } from '../composables/useDeviceAccounts';

/**
 * `<AuthAccountSwitcher>`: the signed-in account, for an app's header or sidebar. Opens to switch to another account
 * signed in on this browser, add one, or sign out of them all. Better Auth's Multi Session plugin; signed-in users
 * only (renders nothing otherwise).
 */
const props = withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg'; block?: boolean }>(), { size: 'md', block: false });

const { t } = useAuthI18n();
const { capabilities } = useAuthCapabilities();
const { loggedIn, user, signOut } = useUserSession();
const signOutTarget = useSignOutTarget();
const { accounts, switchTo, addAccountLink } = useDeviceAccounts();

const items = computed<DropdownMenuItem[][]>(() => [
    [
        { type: 'label', label: t('accounts.switcher.title') },
        ...accounts.value.map((account) => ({
            label: account.user.name || account.user.email,
            description: account.user.email,
            avatar: { src: account.user.image ?? undefined, alt: account.user.name },
            icon: account.current ? 'i-lucide-check' : undefined,
            disabled: account.current,
            onSelect: () => switchTo(account)
        }))
    ],
    [
        ...(addAccountLink.value
            ? [{ label: t('accounts.add'), icon: 'i-lucide-user-plus', to: addAccountLink.value }]
            : []),
        {
            label: accounts.value.length > 1 ? t('accounts.signOutAll') : t('accounts.signOut'),
            icon: 'i-lucide-log-out',
            onSelect: () =>
                signOut({
                    onSuccess: async () => {
                        await navigateTo(signOutTarget);
                    }
                })
        }
    ]
]);
</script>

<template>
    <UDropdownMenu v-if="loggedIn && capabilities?.multiSession" :items="items" :content="{ align: 'start' }">
        <UButton
            :label="user?.name"
            :avatar="{ src: user?.image ?? undefined, alt: user?.name ?? '' }"
            trailing-icon="i-lucide-chevrons-up-down"
            color="neutral"
            variant="ghost"
            :size="props.size"
            :block="props.block"
        />
    </UDropdownMenu>
</template>
