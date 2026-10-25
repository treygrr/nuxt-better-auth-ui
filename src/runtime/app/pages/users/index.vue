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
        : ['banned', 'unverified', ...staffRoles.map((role) => `role:${role}`)].includes(routeFilter)
          ? routeFilter
          : 'all'
);
const sorting = ref([{ id: 'createdAt', desc: true }]);
const rowSelection = ref<Record<string, boolean>>({});
const columnVisibility = ref<Record<string, boolean>>({});

// Better Auth's list-users takes one filter at a time.
const filters: Record<string, { field: 'role' | 'banned' | 'emailVerified'; value: string } | undefined> = {
    all: undefined,
    ...Object.fromEntries(staffRoles.map((role) => [`role:${role}`, { field: 'role' as const, value: role }])),
    banned: { field: 'banned', value: 'true' },
    unverified: { field: 'emailVerified', value: 'false' }
};

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
        toast.add({ title: 'Something went wrong', description: (error as Error).message, color: 'error' });
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
                label: 'View details',
                icon: 'i-lucide-user',
                onSelect: () => navigateTo(adminPath(`/users/${user.id}`))
            },
            {
                label: 'Copy user ID',
                icon: 'i-lucide-copy',
                onSelect: async () => {
                    await navigator.clipboard.writeText(user.id);
                    toast.add({ title: 'Copied to clipboard', description: user.id });
                }
            }
        ],
        [
            can({ user: ['update'] }) && {
                label: 'Edit',
                icon: 'i-lucide-pencil',
                onSelect: () => openModal('edit', [user])
            },
            can({ user: ['set-role'] }) && {
                label: 'Change role',
                icon: 'i-lucide-shield',
                disabled: self,
                onSelect: () => openModal('role', [user])
            },
            { label: 'Password', icon: 'i-lucide-key-round', onSelect: () => openModal('password', [user]) },
            can({ user: ['update'] }) &&
                !user.emailVerified && {
                    label: 'Resend verification email',
                    icon: 'i-lucide-mail',
                    onSelect: () =>
                        run(() => admin.sendVerification(user.id), `Verification email sent to ${user.email}`)
                },
            can({ session: ['revoke'] }) && {
                label: 'Sign out everywhere',
                icon: 'i-lucide-log-out',
                disabled: self,
                onSelect: () => run(() => admin.revokeSessions(user.id), `${user.name} was signed out everywhere`)
            }
        ],
        [impersonateItem(user)],
        [
            can({ user: ['ban'] }) &&
                (user.banned
                    ? {
                          label: 'Unban',
                          icon: 'i-lucide-shield-check',
                          onSelect: () => run(() => admin.unban(user.id), `${user.name} was unbanned`)
                      }
                    : {
                          label: 'Ban',
                          icon: 'i-lucide-ban',
                          color: 'error',
                          disabled: self,
                          onSelect: () => openModal('ban', [user])
                      }),
            can({ user: ['delete'] }) && {
                label: 'Delete',
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

const columns: TableColumn<AdminUser>[] = [
    {
        id: 'select',
        enableHiding: false,
        header: ({ table }) =>
            h(UCheckbox, {
                modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
                'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
                'aria-label': 'Select all'
            }),
        cell: ({ row }) =>
            h(UCheckbox, {
                modelValue: row.getIsSelected(),
                'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
                'aria-label': 'Select row'
            })
    },
    {
        accessorKey: 'name',
        header: sortHeader('User'),
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
                    h('p', { class: 'text-muted' }, row.original.email)
                ])
            ])
    },
    {
        accessorKey: 'role',
        header: 'Role',
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
        header: 'Status',
        cell: ({ row }) =>
            row.original.banned
                ? h(UBadge, { label: 'Banned', color: 'error', variant: 'subtle' })
                : h(UBadge, { label: 'Active', color: 'success', variant: 'subtle' })
    },
    {
        accessorKey: 'emailVerified',
        header: 'Email',
        cell: ({ row }) =>
            row.original.emailVerified
                ? h(UBadge, { label: 'Verified', color: 'success', variant: 'outline' })
                : h(UBadge, { label: 'Unverified', color: 'warning', variant: 'outline' })
    },
    {
        id: 'signIn',
        header: 'Sign-in',
        cell: ({ row }) => {
            const ids = providers.value[row.original.id];
            if (!ids) return providersStatus.value === 'pending' ? h('span', { class: 'text-dimmed' }, '…') : null;
            if (!ids.length) return h(UBadge, { label: 'None', color: 'warning', variant: 'outline' });
            return h(
                'div',
                { class: 'flex items-center gap-1.5' },
                sortProviders(ids).map((id) =>
                    h(UTooltip, { text: providerInfo(id).label }, () =>
                        h(UIcon, {
                            name: providerInfo(id).icon,
                            class: 'size-4.5 text-muted',
                            'aria-label': providerInfo(id).label
                        })
                    )
                )
            );
        }
    },
    ...(activityTracking
        ? [
              {
                  id: 'lastActive',
                  header: 'Last active',
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
                  header: 'Last sign-in',
                  cell: ({ row }: { row: Row<AdminUser> }) => {
                      const at = lastSignIns.value[row.original.id];
                      return at
                          ? h(NuxtTime, { datetime: at, relative: true, title: true })
                          : h(
                                'span',
                                {
                                    class: 'text-dimmed',
                                    title: auditLogRetentionDays
                                        ? `Not in the last ${auditLogRetentionDays} days`
                                        : 'Never'
                                },
                                '—'
                            );
                  }
              } satisfies TableColumn<AdminUser>
          ]
        : []),
    {
        accessorKey: 'createdAt',
        header: sortHeader('Joined'),
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
                        'aria-label': 'Actions'
                    })
                )
            )
    }
];

const columnLabels: Record<string, string> = {
    banned: 'Status',
    emailVerified: 'Email',
    signIn: 'Sign-in',
    lastSignIn: 'Last sign-in',
    lastActive: 'Last active'
};

// One filter per staff role, eg "Admins", "Moderators".
const filterItems = [
    { label: 'All users', value: 'all' },
    ...staffRoles.map((role) => ({ label: `${upperFirst(role)}s`, value: `role:${role}` })),
    { label: 'Banned', value: 'banned' },
    { label: 'Unverified', value: 'unverified' }
];

const bulkTargets = computed(() => selected.value.filter((user) => !isSelf(user)));
</script>

<template>
    <UDashboardPanel id="better-auth-admin-users">
        <template #header>
            <UDashboardNavbar title="Users" :badge="data?.total">
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
                            { label: 'Email', value: 'email' },
                            { label: 'Name', value: 'name' }
                        ]"
                        class="w-24"
                    />
                    <UInput
                        v-model="search"
                        class="max-w-sm"
                        icon="i-lucide-search"
                        :placeholder="`Search by ${searchField}…`"
                    />
                </UFieldGroup>

                <div class="flex flex-wrap items-center gap-1.5">
                    <template v-if="bulkTargets.length">
                        <UButton
                            v-if="can({ user: ['ban'] })"
                            label="Ban"
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
                            label="Delete"
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
                            label="Display"
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
                title="Couldn't load users"
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
                    {{ selected.length }} of {{ users.length }} on this page selected · {{ data?.total ?? 0 }} users
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
