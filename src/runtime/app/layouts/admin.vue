<script setup lang="ts">
// Adapted from the Nuxt UI dashboard template (https://github.com/nuxt-ui-templates/dashboard, MIT).
import type { NavigationMenuItem } from '@nuxt/ui';
import {
    computed,
    onMounted,
    ref,
    useAdminPath,
    useBetterAuthAdminConfig,
    useCookie,
    useRoute,
    useToast
} from '#imports';

const route = useRoute();
const toast = useToast();
const adminPath = useAdminPath();
const { auditLog } = useBetterAuthAdminConfig();

const open = ref(false);
const close = () => {
    open.value = false;
};

const links = computed(
    () =>
        [
            [
                {
                    label: 'Home',
                    icon: 'i-lucide-house',
                    to: adminPath('/'),
                    exact: true,
                    onSelect: close
                },
                {
                    label: 'Users',
                    icon: 'i-lucide-user-cog',
                    to: adminPath('/users'),
                    onSelect: close
                },
                ...(auditLog
                    ? [{ label: 'Audit log', icon: 'i-lucide-history', to: adminPath('/audit'), onSelect: close }]
                    : []),
                {
                    label: 'Inbox',
                    icon: 'i-lucide-inbox',
                    to: adminPath('/inbox'),
                    badge: '4',
                    onSelect: close
                },
                {
                    label: 'Customers',
                    icon: 'i-lucide-users',
                    to: adminPath('/customers'),
                    onSelect: close
                },
                {
                    label: 'Settings',
                    to: adminPath('/settings'),
                    icon: 'i-lucide-settings',
                    defaultOpen: true,
                    type: 'trigger',
                    children: [
                        {
                            label: 'General',
                            to: adminPath('/settings'),
                            exact: true,
                            onSelect: close
                        },
                        {
                            label: 'Members',
                            to: adminPath('/settings/members'),
                            onSelect: close
                        },
                        {
                            label: 'Notifications',
                            to: adminPath('/settings/notifications'),
                            onSelect: close
                        },
                        {
                            label: 'Security',
                            to: adminPath('/settings/security'),
                            onSelect: close
                        }
                    ]
                }
            ],
            [
                {
                    label: 'Feedback',
                    icon: 'i-lucide-message-circle',
                    to: 'https://github.com/nuxt-ui-templates/dashboard',
                    target: '_blank'
                },
                {
                    label: 'Help & Support',
                    icon: 'i-lucide-info',
                    to: 'https://github.com/nuxt-ui-templates/dashboard',
                    target: '_blank'
                }
            ]
        ] satisfies NavigationMenuItem[][]
);

const groups = computed(() => [
    {
        id: 'links',
        label: 'Go to',
        items: links.value.flat()
    },
    {
        id: 'code',
        label: 'Code',
        items: [
            {
                id: 'source',
                label: 'View page source',
                icon: 'i-simple-icons-github',
                to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
                target: '_blank'
            }
        ]
    }
]);

onMounted(async () => {
    const cookie = useCookie('cookie-consent');
    if (cookie.value === 'accepted') {
        return;
    }

    toast.add({
        title: 'We use first-party cookies to enhance your experience on our website.',
        duration: 0,
        close: false,
        actions: [
            {
                label: 'Accept',
                color: 'neutral',
                variant: 'outline',
                onClick: () => {
                    cookie.value = 'accepted';
                }
            },
            {
                label: 'Opt out',
                color: 'neutral',
                variant: 'ghost'
            }
        ]
    });
});
</script>

<template>
    <UDashboardGroup unit="rem">
        <UDashboardSidebar
            id="better-auth-admin"
            v-model:open="open"
            collapsible
            resizable
            class="bg-elevated/25"
            :ui="{ footer: 'lg:border-t lg:border-default' }"
        >
            <template #header="{ collapsed }">
                <AdminTeamsMenu :collapsed="collapsed" />
            </template>

            <template #default="{ collapsed }">
                <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

                <UNavigationMenu :collapsed="collapsed" :items="links[0]" orientation="vertical" tooltip popover />

                <UNavigationMenu
                    :collapsed="collapsed"
                    :items="links[1]"
                    orientation="vertical"
                    tooltip
                    class="mt-auto"
                />
            </template>

            <template #footer="{ collapsed }">
                <AdminUserMenu :collapsed="collapsed" />
            </template>
        </UDashboardSidebar>

        <UDashboardSearch :groups="groups" />

        <slot />

        <AdminNotificationsSlideover />
    </UDashboardGroup>
</template>
