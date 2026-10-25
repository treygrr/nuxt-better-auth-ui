<script setup lang="ts">
// The table follows the Nuxt UI dashboard template's customers page; the data is Better Auth's.
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { refDebounced } from '@vueuse/core';
import { upperFirst } from 'scule';
import type { Row } from '@tanstack/table-core';
import {
    computed,
    h,
    navigateTo,
    ref,
    resolveComponent,
    useAdminCan,
    useAdminPath,
    useAdminUsers,
    useAuthCapabilities,
    useAuthI18n,
    useBetterAuthAdminConfig,
    useFetch,
    useRoute,
    useTemplateRef,
    useToast,
    watch
} from '#imports';

import { ADMIN_API } from '../../../constants';
import type { AdminUser } from '../../types';
import { useImpersonateItem } from '../../composables/useImpersonateItem';
import { shownItems } from '../../utils/menu';
import { providerInfo, sortProviders } from '../../utils/providers';

const UAvatar = resolveComponent('UAvatar');
const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const UCheckbox = resolveComponent('UCheckbox');
const UDropdownMenu = resolveComponent('UDropdownMenu');
const UIcon = resolveComponent('UIcon');
const NuxtTime = resolveComponent('NuxtTime');
const UTooltip = resolveComponent('UTooltip');

const adminPath = useAdminPath();
const { role: adminRole, staffRoles } = useBetterAuthAdminConfig();
const can = useAdminCan();
const session = useUserSession();
const admin = useAdminUsers();
const toast = useToast();
const { t } = useAuthI18n();
const table = useTemplateRef('table');

const PAGE_SIZE = 20;
const page = ref(1);
const search = ref('');
const searchField = ref<'email' | 'name'>('email');
const debouncedSearch = refDebounced(search, 300);
// Linkable, eg from the home page's Banned card: ?filter=banned
const routeFilter = String(useRoute().query.filter ?? '');
const filter = ref(
    routeFilter === 'admins'
        ? `role:${adminRole}`
        : ['banned', 'unverified', 'no-two-factor', 'guests', ...staffRoles.map((role) => `role:${role}`)].includes(
                routeFilter
            )
          ? routeFilter
          : 'all'
);
const sorting = ref([{ id: 'createdAt', desc: true }]);
const rowSelection = ref<Record<string, boolean>>({});
const columnVisibility = ref<Record<string, boolean>>({});

// Better Auth's list-users takes one filter at a time.
const filters: Record<
    string,
    { field: 'role' | 'banned' | 'emailVerified' | 'twoFactorEnabled' | 'isAnonymous'; value: string } | undefined
> = {
    all: undefined,
    ...Object.fromEntries(staffRoles.map((role) => [`role:${role}`, { field: 'role' as const, value: role }])),
    banned: { field: 'banned', value: 'true' },
    unverified: { field: 'emailVerified', value: 'false' },
    // The Two-Factor plugin's column on the user.
    'no-two-factor': { field: 'twoFactorEnabled', value: 'false' },
    // The Anonymous plugin's column.
    guests: { field: 'isAnonymous', value: 'true' }
};
const { capabilities } = useAuthCapabilities();

watch([debouncedSearch, searchField, filter, sorting], () => {
    page.value = 1;
});
watch(page, () => {
    rowSelection.value = {};
});

// Better Auth's list-users, fetched during server rendering and refetched as the query changes.
const listQuery = computed(() => {
    const term = debouncedSearch.value.trim();
    const where = filters[filter.value];
    return {
        limit: PAGE_SIZE,
        offset: (page.value - 1) * PAGE_SIZE,
        sortBy: sorting.value[0]?.id ?? 'createdAt',
        sortDirection: sorting.value[0]?.desc === false ? 'asc' : 'desc',
        ...(term && { searchValue: term, searchField: searchField.value, searchOperator: 'contains' }),
        ...(where && { filterField: where.field, filterValue: where.value, filterOperator: 'eq' })
    };
});
const { data, status, error, refresh } = await useFetch<{ users: AdminUser[]; total: number }>(
    '/api/auth/admin/list-users',
    { query: listQuery }
);

const users = computed(() => data.value?.users ?? []);

// When each listed user last signed in, from the audit log, when it records sign-ins.
const { lastSignIn: knowsLastSignIn, auditLogRetentionDays } = useBetterAuthAdminConfig();
const { data: lastSignIns } = await useFetch<Record<string, string | null>>(`${ADMIN_API}/last-sign-in`, {
    query: computed(() => ({ userIds: users.value.map((user) => user.id).join(',') })),
    default: () => ({}),
    immediate: knowsLastSignIn
});

// When each listed user was last active, with activity tracking.
const { activityTracking } = useBetterAuthAdminConfig();
const { data: lastActive } = await useFetch<Record<string, string | null>>(`${ADMIN_API}/last-active`, {
    query: computed(() => ({ userIds: users.value.map((user) => user.id).join(',') })),
    default: () => ({}),
    immediate: activityTracking
});

// Each listed user's sign-in methods, for the whole page in one request.
const { data: providers, status: providersStatus } = await useFetch<Record<string, string[]>>(`${ADMIN_API}/accounts`, {
    query: computed(() => ({ userIds: users.value.map((user) => user.id).join(',') })),
    default: () => ({})
});
const isSelf = (user: AdminUser) => user.id === session.user.value?.id;
const selected = computed(() => users.value.filter((user) => rowSelection.value[user.id]));

// Which modal is open, and for whom.
const modal = ref<'role' | 'ban' | 'delete' | 'password' | 'edit' | null>(null);
const targets = ref<AdminUser[]>([]);
const openModal = (name: NonNullable<typeof modal.value>, forUsers: AdminUser[]) => {
    targets.value = forUsers;
    modal.value = name;
};
const modalOpen = (name: NonNullable<typeof modal.value>) =>
    computed({
        get: () => modal.value === name,
        set: (value) => {
            if (!value) modal.value = null;
        }
    });
const roleOpen = modalOpen('role');
const banOpen = modalOpen('ban');
const deleteOpen = modalOpen('delete');
const passwordOpen = modalOpen('password');
const editOpen = modalOpen('edit');

const afterChange = async () => {
    rowSelection.value = {};
    await refresh();
};

async function run(action: () => Promise<unknown>, success: string) {
    try {
        await action();
        toast.add({ title: success, color: 'success' });
        await refresh();
    } catch (error) {
        toast.add({
            title: t('admin.common.somethingWentWrong'),
            description: (error as Error).message,
            color: 'error'
        });
    }
}

const impersonateItem = useImpersonateItem();

// Only the actions the admin's role allows; some are off for your own account.
function rowItems(row: Row<AdminUser>): DropdownMenuItem[][] {
    const user = row.original;
    const self = isSelf(user);
    return shownItems([
        [
            { type: 'label', label: user.email },
            {
                label: t('admin.users.viewDetails'),
                icon: 'i-lucide-user',
                onSelect: () => navigateTo(adminPath(`/users/${user.id}`))
            },
            {
                label: t('admin.users.copyId'),
                icon: 'i-lucide-copy',
                onSelect: async () => {
                    await navigator.clipboard.writeText(user.id);
                    toast.add({ title: t('admin.common.copied'), description: user.id });
                }
            }
        ],
        [
            can({ user: ['update'] }) && {
                label: t('admin.common.edit'),
                icon: 'i-lucide-pencil',
                onSelect: () => openModal('edit', [user])
            },
            can({ user: ['set-role'] }) && {
                label: t('admin.common.changeRole'),
                icon: 'i-lucide-shield',
                disabled: self,
                onSelect: () => openModal('role', [user])
            },
            {
                label: t('admin.common.password'),
                icon: 'i-lucide-key-round',
                onSelect: () => openModal('password', [user])
            },
            can({ user: ['update'] }) &&
                !user.emailVerified && {
                    label: t('admin.common.resendVerification'),
                    icon: 'i-lucide-mail',
                    onSelect: () =>
                        run(
                            () => admin.sendVerification(user.id),
                            t('admin.common.verificationSent', { email: user.email })
                        )
                },
            can({ session: ['revoke'] }) && {
                label: t('admin.common.signOutEverywhere'),
                icon: 'i-lucide-log-out',
                disabled: self,
                onSelect: () =>
                    run(() => admin.revokeSessions(user.id), t('admin.common.signedOutEverywhere', { name: user.name }))
            }
        ],
        [impersonateItem(user)],
        [
            can({ user: ['ban'] }) &&
                (user.banned
                    ? {
                          label: t('admin.common.unban'),
                          icon: 'i-lucide-shield-check',
                          onSelect: () =>
                              run(() => admin.unban(user.id), t('admin.common.unbanned', { name: user.name }))
                      }
                    : {
                          label: t('admin.common.ban'),
                          icon: 'i-lucide-ban',
                          color: 'error',
                          disabled: self,
                          onSelect: () => openModal('ban', [user])
                      }),
            can({ user: ['delete'] }) && {
                label: t('admin.common.delete'),
                icon: 'i-lucide-trash',
                color: 'error',
                disabled: self,
                onSelect: () => openModal('delete', [user])
            }
        ]
    ]);
}

const sortHeader =
    (label: string) =>
    ({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc: boolean) => void } }) => {
        const sorted = column.getIsSorted();
        return h(UButton, {
            color: 'neutral',
            variant: 'ghost',
            label,
            icon: sorted
                ? sorted === 'asc'
                    ? 'i-lucide-arrow-up-narrow-wide'
                    : 'i-lucide-arrow-down-wide-narrow'
                : 'i-lucide-arrow-up-down',
            class: '-mx-2.5',
            onClick: () => column.toggleSorting(sorted === 'asc')
        });
    };

const columns = computed<TableColumn<AdminUser>[]>(() => [
    {
        id: 'select',
        enableHiding: false,
        header: ({ table }) =>
            h(UCheckbox, {
                modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
                'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
                'aria-label': t('admin.users.selectAll')
            }),
        cell: ({ row }) =>
            h(UCheckbox, {
                modelValue: row.getIsSelected(),
                'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
                'aria-label': t('admin.users.selectRow')
            })
    },
    {
        accessorKey: 'name',
        header: sortHeader(t('admin.users.columns.user')),
        enableHiding: false,
        cell: ({ row }) =>
            h('div', { class: 'flex items-center gap-3' }, [
                h(UAvatar, { src: row.original.image ?? undefined, alt: row.original.name, size: 'lg' }),
                h('div', undefined, [
                    h(
                        'a',
                        {
                            href: adminPath(`/users/${row.original.id}`),
                            class: 'font-medium text-highlighted hover:underline',
                            onClick: (event: MouseEvent) => {
                                event.preventDefault();
                                navigateTo(adminPath(`/users/${row.original.id}`));
                            }
                        },
                        row.original.name
                    ),
                    // With the Username plugin: their handle, as they typed it.
                    h(
                        'p',
                        { class: 'text-muted' },
                        // Guests' (Anonymous plugin) emails are generated.
                        row.original.isAnonymous
                            ? t('admin.users.guestAccount')
                            : row.original.username
                              ? `@${row.original.displayUsername || row.original.username} · ${row.original.email}`
                              : row.original.email
                    )
                ])
            ])
    },
    {
        accessorKey: 'role',
        header: t('admin.users.columns.role'),
        cell: ({ row }) =>
            h(UBadge, {
                label: row.original.role ?? 'user',
                color: (row.original.role ?? 'user').split(',').some((role) => staffRoles.includes(role))
                    ? 'primary'
                    : 'neutral',
                variant: 'subtle',
                class: 'capitalize'
            })
    },
    {
        accessorKey: 'banned',
        header: t('admin.users.columns.status'),
        cell: ({ row }) =>
            row.original.banned
                ? h(UBadge, { label: t('admin.common.banned'), color: 'error', variant: 'subtle' })
                : h(UBadge, { label: t('admin.common.active'), color: 'success', variant: 'subtle' })
    },
    {
        accessorKey: 'emailVerified',
        header: t('admin.users.columns.email'),
        cell: ({ row }) =>
            row.original.isAnonymous
                ? h(UBadge, { label: t('admin.common.guest'), color: 'neutral', variant: 'outline' })
                : row.original.emailVerified
                  ? h(UBadge, { label: t('admin.common.verified'), color: 'success', variant: 'outline' })
                  : h(UBadge, { label: t('admin.common.unverified'), color: 'warning', variant: 'outline' })
    },
    {
        id: 'signIn',
        header: t('admin.users.columns.signIn'),
        cell: ({ row }) => {
            const ids = providers.value[row.original.id];
            if (!ids) return providersStatus.value === 'pending' ? h('span', { class: 'text-dimmed' }, '…') : null;
            if (!ids.length && row.original.isAnonymous) return h('span', { class: 'text-dimmed' }, '—');
            if (!ids.length) return h(UBadge, { label: t('admin.users.none'), color: 'warning', variant: 'outline' });
            return h('div', { class: 'flex items-center gap-1.5' }, [
                ...sortProviders(ids).map((id) =>
                    h(UTooltip, { text: providerInfo(id).label }, () =>
                        h(UIcon, {
                            name: providerInfo(id).icon,
                            class: 'size-4.5 text-muted',
                            'aria-label': providerInfo(id).label
                        })
                    )
                ),
                // Two-factor, from the user's own record (the Two-Factor plugin's column).
                row.original.twoFactorEnabled
                    ? h(UTooltip, { text: t('admin.common.twoFactorOn') }, () =>
                          h(UIcon, {
                              name: 'i-lucide-shield-check',
                              class: 'size-4.5 text-success',
                              'aria-label': t('admin.common.twoFactorOn')
                          })
                      )
                    : null
            ]);
        }
    },
    ...(activityTracking
        ? [
              {
                  id: 'lastActive',
                  header: t('admin.common.lastActive'),
                  cell: ({ row }: { row: Row<AdminUser> }) => {
                      const at = lastActive.value[row.original.id];
                      return at
                          ? h(NuxtTime, { datetime: at, relative: true, title: true })
                          : h('span', { class: 'text-dimmed' }, '—');
                  }
              } satisfies TableColumn<AdminUser>
          ]
        : []),
    ...(knowsLastSignIn
        ? [
              {
                  id: 'lastSignIn',
                  header: t('admin.common.lastSignIn'),
                  cell: ({ row }: { row: Row<AdminUser> }) => {
                      const at = lastSignIns.value[row.original.id];
                      return at
                          ? h(NuxtTime, { datetime: at, relative: true, title: true })
                          : h(
                                'span',
                                {
                                    class: 'text-dimmed',
                                    title: auditLogRetentionDays
                                        ? t('admin.common.notInLastDays', { days: auditLogRetentionDays })
                                        : t('admin.common.never')
                                },
                                '—'
                            );
                  }
              } satisfies TableColumn<AdminUser>
          ]
        : []),
    {
        accessorKey: 'createdAt',
        header: sortHeader(t('admin.users.columns.joined')),
        cell: ({ row }) => h(NuxtTime, { datetime: row.original.createdAt, dateStyle: 'medium' })
    },
    {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) =>
            h(
                'div',
                { class: 'text-right' },
                h(UDropdownMenu, { content: { align: 'end' }, items: rowItems(row) }, () =>
                    h(UButton, {
                        icon: 'i-lucide-ellipsis-vertical',
                        color: 'neutral',
                        variant: 'ghost',
                        class: 'ml-auto',
                        'aria-label': t('admin.common.actions')
                    })
                )
            )
    }
]);

const columnLabels = computed<Record<string, string>>(() => ({
    role: t('admin.users.columns.role'),
    banned: t('admin.users.columns.status'),
    emailVerified: t('admin.users.columns.email'),
    signIn: t('admin.users.columns.signIn'),
    lastSignIn: t('admin.common.lastSignIn'),
    lastActive: t('admin.common.lastActive'),
    createdAt: t('admin.users.columns.joined')
}));

// One filter per staff role, eg "Admins", "Moderators"; "Two-factor off" when the app uses two-factor, "Guests"
// with guest accounts.
const filterItems = computed(() => [
    { label: t('admin.users.filters.all'), value: 'all' },
    ...staffRoles.map((role) => ({
        label: t('admin.users.filters.role', { role: upperFirst(role) }),
        value: `role:${role}`
    })),
    { label: t('admin.users.filters.banned'), value: 'banned' },
    { label: t('admin.users.filters.unverified'), value: 'unverified' },
    ...(capabilities.value?.twoFactor ? [{ label: t('admin.users.filters.noTwoFactor'), value: 'no-two-factor' }] : []),
    ...(capabilities.value?.anonymous ? [{ label: t('admin.users.filters.guests'), value: 'guests' }] : [])
]);

const bulkTargets = computed(() => selected.value.filter((user) => !isSelf(user)));
</script>

<template>
    <UDashboardPanel id="better-auth-ui-users">
        <template #header>
            <UDashboardNavbar :title="t('admin.users.title')" :badge="data?.total">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>

                <template #right>
                    <AdminUsersCreateModal v-if="can({ user: ['create'] })" @created="refresh" />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <div class="flex flex-wrap items-center justify-between gap-1.5">
                <UFieldGroup>
                    <USelect
                        v-model="searchField"
                        :items="[
                            { label: t('admin.common.email'), value: 'email' },
                            { label: t('admin.common.name'), value: 'name' }
                        ]"
                        class="w-24"
                    />
                    <UInput
                        v-model="search"
                        class="max-w-sm"
                        icon="i-lucide-search"
                        :placeholder="
                            t(searchField === 'name' ? 'admin.users.searchByName' : 'admin.users.searchByEmail')
                        "
                    />
                </UFieldGroup>

                <div class="flex flex-wrap items-center gap-1.5">
                    <template v-if="bulkTargets.length">
                        <UButton
                            v-if="can({ user: ['ban'] })"
                            :label="t('admin.common.ban')"
                            color="error"
                            variant="subtle"
                            icon="i-lucide-ban"
                            @click="openModal('ban', bulkTargets)"
                        >
                            <template #trailing>
                                <UKbd>{{ bulkTargets.length }}</UKbd>
                            </template>
                        </UButton>
                        <UButton
                            v-if="can({ user: ['delete'] })"
                            :label="t('admin.common.delete')"
                            color="error"
                            variant="subtle"
                            icon="i-lucide-trash"
                            @click="openModal('delete', bulkTargets)"
                        >
                            <template #trailing>
                                <UKbd>{{ bulkTargets.length }}</UKbd>
                            </template>
                        </UButton>
                    </template>

                    <USelect
                        v-model="filter"
                        :items="filterItems"
                        :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
                        class="min-w-32"
                    />

                    <UDropdownMenu
                        :items="
                            table?.tableApi
                                ?.getAllColumns()
                                .filter((column: any) => column.getCanHide())
                                .map((column: any) => ({
                                    label: columnLabels[column.id] ?? upperFirst(column.id),
                                    type: 'checkbox' as const,
                                    checked: column.getIsVisible(),
                                    onUpdateChecked(checked: boolean) {
                                        table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked);
                                    },
                                    onSelect(e?: Event) {
                                        e?.preventDefault();
                                    }
                                }))
                        "
                        :content="{ align: 'end' }"
                    >
                        <UButton
                            :label="t('admin.users.display')"
                            color="neutral"
                            variant="outline"
                            trailing-icon="i-lucide-settings-2"
                        />
                    </UDropdownMenu>
                </div>
            </div>

            <UAlert
                v-if="error"
                color="error"
                icon="i-lucide-circle-alert"
                :title="t('admin.users.loadFailed')"
                :description="
                    (error.data as { message?: string } | undefined)?.message || error.statusMessage || error.message
                "
            />

            <UTable
                ref="table"
                v-model:row-selection="rowSelection"
                v-model:column-visibility="columnVisibility"
                v-model:sorting="sorting"
                :sorting-options="{ manualSorting: true }"
                :get-row-id="(row: AdminUser) => row.id"
                class="shrink-0"
                :data="users"
                :columns="columns"
                :loading="status === 'pending'"
                :ui="{
                    base: 'table-fixed border-separate border-spacing-0',
                    thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                    tbody: '[&>tr]:last:[&>td]:border-b-0',
                    th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                    td: 'border-b border-default',
                    separator: 'h-0'
                }"
            />

            <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
                <div class="text-sm text-muted">
                    {{
                        t('admin.users.footer', {
                            selected: selected.length,
                            count: users.length,
                            total: data?.total ?? 0
                        })
                    }}
                </div>
                <UPagination v-model:page="page" :items-per-page="PAGE_SIZE" :total="data?.total ?? 0" />
            </div>

            <template v-if="targets.length">
                <AdminUsersRoleModal v-model:open="roleOpen" :user="targets[0]!" @updated="afterChange" />
                <AdminUsersEditModal v-model:open="editOpen" :user="targets[0]!" @updated="afterChange" />
                <AdminUsersPasswordModal v-model:open="passwordOpen" :user="targets[0]!" />
                <AdminUsersBanModal v-model:open="banOpen" :users="targets" @banned="afterChange" />
                <AdminUsersDeleteModal v-model:open="deleteOpen" :users="targets" @deleted="afterChange" />
            </template>
        </template>
    </UDashboardPanel>
</template>
