<script setup lang="ts">
import { computed, navigateTo, useAuthI18n, useAuthPages, useColorMode } from '#imports';
import type { DropdownMenuItem } from '@nuxt/ui';
import { useUserSession } from '@nuxtjs/better-auth/composables';

import { useSignOutTarget } from '../composables/useAuthPages';

/** The signed-in admin, at the foot of the sidebar: their account, the colour mode, back to the site, sign out. */
defineProps<{
    collapsed?: boolean;
}>();

const colorMode = useColorMode();
const session = useUserSession();
const pages = useAuthPages();
const signOutTarget = useSignOutTarget();
const { t } = useAuthI18n();

const user = computed(() => ({
    name: session.user.value?.name ?? '',
    email: session.user.value?.email ?? '',
    avatar: {
        src: session.user.value?.image ?? undefined,
        alt: session.user.value?.name ?? ''
    }
}));

const modes = [
    { label: 'admin.userMenu.light', value: 'light', icon: 'i-lucide-sun' },
    { label: 'admin.userMenu.dark', value: 'dark', icon: 'i-lucide-moon' },
    { label: 'admin.userMenu.system', value: 'system', icon: 'i-lucide-monitor' }
] as const;

const items = computed<DropdownMenuItem[][]>(() => [
    [
        {
            type: 'label',
            label: user.value.email,
            avatar: user.value.avatar
        }
    ],
    [
        ...(pages.account
            ? [{ label: t('admin.userMenu.yourAccount'), icon: 'i-lucide-user-round', to: pages.account }]
            : []),
        {
            label: t('admin.userMenu.appearance'),
            icon: 'i-lucide-sun-moon',
            children: modes.map((mode) => ({
                label: t(mode.label),
                icon: mode.icon,
                type: 'checkbox' as const,
                checked: colorMode.preference === mode.value,
                onSelect(event: Event) {
                    event.preventDefault();
                    colorMode.preference = mode.value;
                }
            }))
        }
    ],
    [
        {
            label: t('admin.userMenu.backToSite'),
            icon: 'i-lucide-arrow-left',
            to: '/'
        },
        {
            label: t('admin.userMenu.logOut'),
            icon: 'i-lucide-log-out',
            onSelect: () =>
                session.signOut({
                    onSuccess: async () => {
                        await navigateTo(signOutTarget);
                    }
                })
        }
    ]
]);
</script>

<template>
    <UDropdownMenu
        :items="items"
        :content="{ align: 'center', collisionPadding: 12 }"
        :ui="{ content: collapsed ? 'w-56' : 'w-(--reka-dropdown-menu-trigger-width)' }"
    >
        <UButton
            :avatar="user.avatar"
            :label="collapsed ? undefined : user.name"
            :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            class="data-[state=open]:bg-elevated"
            :ui="{
                trailingIcon: 'text-dimmed'
            }"
        />
    </UDropdownMenu>
</template>
