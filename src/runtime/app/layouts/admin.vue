<script setup lang="ts">
// Adapted from the Nuxt UI dashboard template (https://github.com/nuxt-ui-templates/dashboard, MIT).
import type { CommandPaletteGroup, CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui';
import { refDebounced } from '@vueuse/core';
import {
    $fetch,
    computed,
    ref,
    useAdminCan,
    useAdminDashboard,
    useAdminPath,
    useAuthPages,
    useBetterAuthAdminConfig,
    useLazyAsyncData
} from '#imports';

// Layouts are copied into .nuxt when built, so this one can't import the module's files by relative path.
type FoundUser = { id: string; name: string; email: string; image?: string | null };

const adminPath = useAdminPath();
const pages = useAuthPages();
const { auditLog } = useBetterAuthAdminConfig();
const can = useAdminCan();
useAdminDashboard();

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
                ...(can({ session: ['list'] })
                    ? [
                          {
                              label: 'Sessions',
                              icon: 'i-lucide-monitor-smartphone',
                              to: adminPath('/sessions'),
                              onSelect: close
                          }
                      ]
                    : []),
                ...(auditLog
                    ? [{ label: 'Audit log', icon: 'i-lucide-history', to: adminPath('/audit'), onSelect: close }]
                    : []),
                {
                    label: 'Configuration',
                    icon: 'i-lucide-sliders-horizontal',
                    to: adminPath('/configuration'),
                    onSelect: close
                }
            ],
            [
                {
                    label: 'Back to site',
                    icon: 'i-lucide-arrow-left',
                    to: '/'
                }
            ]
        ] satisfies NavigationMenuItem[][]
);

// Search (⌘K): the pages, a few actions, and users by name or email, through Better Auth's list-users.
const searchTerm = ref('');
const term = refDebounced(
    computed(() => searchTerm.value.trim()),
    250
);
// list-users searches one field at a time, so names and emails are asked for together and merged.
const { data: found, status: searchStatus } = useLazyAsyncData(
    'better-auth-ui-search',
    async () => {
        if (term.value.length < 2) return { users: [] };
        const search = (searchField: 'name' | 'email') =>
            $fetch<{ users: FoundUser[] }>('/api/auth/admin/list-users', {
                query: { limit: 8, searchValue: term.value, searchField, searchOperator: 'contains' }
            });
        const [byName, byEmail] = await Promise.all([search('name'), search('email')]);
        const users = [...byName.users, ...byEmail.users];
        return { users: users.filter((user, index) => users.findIndex((other) => other.id === user.id) === index) };
    },
    { server: false, immediate: false, watch: [term], default: () => ({ users: [] }) }
);

const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => [
    {
        id: 'links',
        label: 'Go to',
        items: links.value.flat()
    },
    {
        id: 'actions',
        label: 'Actions',
        items: [
            ...(can({ user: ['create'] })
                ? [{ label: 'Create a user', icon: 'i-lucide-user-plus', to: adminPath('/users?create=1') }]
                : []),
            ...(pages.account ? [{ label: 'Your account', icon: 'i-lucide-user-round', to: pages.account }] : [])
        ]
    },
    ...(term.value.length >= 2
        ? [
              {
                  id: 'users',
                  label: 'Users',
                  // Already matched by Better Auth.
                  ignoreFilter: true,
                  items: (found.value?.users ?? []).map((user) => ({
                      label: user.name,
                      suffix: user.email,
                      avatar: { src: user.image ?? undefined, alt: user.name },
                      to: adminPath(`/users/${user.id}`)
                  }))
              }
          ]
        : [])
]);
</script>

<template>
    <UDashboardGroup unit="rem">
        <UDashboardSidebar
            id="better-auth-ui"
            v-model:open="open"
            collapsible
            resizable
            class="bg-elevated/25"
            :ui="{ footer: 'lg:border-t lg:border-default' }"
        >
            <template #header="{ collapsed }">
                <AdminBrand :collapsed="collapsed" />
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

        <UDashboardSearch
            v-model:search-term="searchTerm"
            :groups="groups"
            :loading="searchStatus === 'pending'"
            placeholder="Search pages and users…"
        />

        <slot />
    </UDashboardGroup>
</template>
