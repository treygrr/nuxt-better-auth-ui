<script setup lang="ts">
// Adapted from the Nuxt UI dashboard template (https://github.com/nuxt-ui-templates/dashboard, MIT).
import type { CommandPaletteGroup, CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui';
import { refDebounced } from '@vueuse/core';
import {
    $fetch,
    computed,
    ref,
    useBetterAuthAdminCan,
    useBetterAuthAdminDashboard,
    useBetterAuthAdminPath,
    useAuthI18n,
    useAuthPages,
    useBetterAuthAdminConfig,
    useLazyAsyncData,
    useRouter
} from '#imports';

// Layouts are copied into .nuxt when built, so this one can't import the module's files by relative path.
type FoundUser = { id: string; name: string; email: string; image?: string | null };
type PageMeta = { label?: string; icon?: string; permissions?: Parameters<typeof can>[0]; order?: number };

const adminPath = useBetterAuthAdminPath();
const pages = useAuthPages();
const { auditLog, organizations, sso, route } = useBetterAuthAdminConfig();
const can = useBetterAuthAdminCan();
const { t } = useAuthI18n();
useBetterAuthAdminDashboard();

// The app's own admin pages labelled in their page meta (`betterAuthAdmin`), by order, then path.
const appPages = useRouter()
    .getRoutes()
    .filter((record) => record.path.startsWith(`${route}/`) && !record.path.includes(':'))
    .map((record) => ({ path: record.path, meta: record.meta.betterAuthAdmin as PageMeta | undefined }))
    .filter((page): page is { path: string; meta: PageMeta & { label: string } } => !!page.meta?.label)
    .sort((a, b) => (a.meta.order ?? 0) - (b.meta.order ?? 0) || a.path.localeCompare(b.path));

const open = ref(false);
const close = () => {
    open.value = false;
};

const links = computed(
    () =>
        [
            [
                {
                    label: t('admin.nav.home'),
                    icon: 'i-lucide-house',
                    to: adminPath('/'),
                    exact: true,
                    onSelect: close
                },
                {
                    label: t('admin.nav.users'),
                    icon: 'i-lucide-user-cog',
                    to: adminPath('/users'),
                    onSelect: close
                },
                ...(organizations
                    ? [
                          {
                              label: t('admin.nav.organizations'),
                              icon: 'i-lucide-building-2',
                              to: adminPath('/organizations'),
                              onSelect: close
                          }
                      ]
                    : []),
                ...(sso
                    ? [
                          {
                              label: t('admin.nav.sso'),
                              icon: 'i-lucide-key-square',
                              to: adminPath('/sso'),
                              onSelect: close
                          }
                      ]
                    : []),
                ...(can({ session: ['list'] })
                    ? [
                          {
                              label: t('admin.nav.sessions'),
                              icon: 'i-lucide-monitor-smartphone',
                              to: adminPath('/sessions'),
                              onSelect: close
                          }
                      ]
                    : []),
                ...(auditLog
                    ? [
                          {
                              label: t('admin.nav.auditLog'),
                              icon: 'i-lucide-history',
                              to: adminPath('/audit'),
                              onSelect: close
                          }
                      ]
                    : []),
                // Checked as the menu renders, so it follows a role change.
                ...appPages
                    .filter((page) => !page.meta.permissions || can(page.meta.permissions))
                    .map((page) => ({
                        // A translation key, or the words themselves (`t` gives back what it doesn't know).
                        label: t(page.meta.label as never),
                        icon: page.meta.icon,
                        to: page.path,
                        onSelect: close
                    })),
                {
                    label: t('admin.nav.configuration'),
                    icon: 'i-lucide-sliders-horizontal',
                    to: adminPath('/configuration'),
                    onSelect: close
                }
            ],
            [
                {
                    label: t('admin.nav.backToSite'),
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
        label: t('admin.search.goTo'),
        items: links.value.flat()
    },
    {
        id: 'actions',
        label: t('admin.search.actions'),
        items: [
            ...(can({ user: ['create'] })
                ? [
                      {
                          label: t('admin.search.createUser'),
                          icon: 'i-lucide-user-plus',
                          to: adminPath('/users?create=1')
                      }
                  ]
                : []),
            ...(pages.account
                ? [{ label: t('admin.search.yourAccount'), icon: 'i-lucide-user-round', to: pages.account }]
                : [])
        ]
    },
    ...(term.value.length >= 2
        ? [
              {
                  id: 'users',
                  label: t('admin.search.users'),
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
                <BetterAuthUiBrand :collapsed="collapsed" />
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
                <BetterAuthUiUserMenu :collapsed="collapsed" />
            </template>
        </UDashboardSidebar>

        <UDashboardSearch
            v-model:search-term="searchTerm"
            :groups="groups"
            :loading="searchStatus === 'pending'"
            :placeholder="t('admin.search.placeholder')"
        />

        <slot />
    </UDashboardGroup>
</template>
