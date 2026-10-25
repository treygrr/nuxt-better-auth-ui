<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import {
    computed,
    h,
    ref,
    resolveComponent,
    useAdminCan,
    useAdminPath,
    useAdminUsers,
    useFetch,
    useToast
} from '#imports';

import { ADMIN_API } from '../../constants';
import { device } from '../utils/device';

type Row = {
    id: string;
    token: string;
    ipAddress: string | null;
    userAgent: string | null;
    impersonatedBy: string | null;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    user: { id: string; name: string; email: string; image: string | null } | null;
};

const UAvatar = resolveComponent('UAvatar');
const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const ULink = resolveComponent('ULink');
const NuxtTime = resolveComponent('NuxtTime');

const adminPath = useAdminPath();
const can = useAdminCan();
const session = useUserSession();
const admin = useAdminUsers();
const toast = useToast();

const PAGE_SIZE = 25;
const page = ref(1);
const { data, status, error, refresh } = await useFetch<{ sessions: Row[]; total: number; available: boolean }>(
    `${ADMIN_API}/sessions`,
    { query: computed(() => ({ limit: PAGE_SIZE, offset: (page.value - 1) * PAGE_SIZE })) }
);
const total = computed(() => data.value?.total ?? 0);
const thisSession = computed(() => session.session.value?.id);

async function signOut(row: Row) {
    try {
        await admin.revokeSession(row.token);
        toast.add({ title: 'Session signed out', description: row.user?.email, color: 'success' });
        await refresh();
    } catch (failure) {
        toast.add({ title: "Couldn't sign it out", description: (failure as Error).message, color: 'error' });
    }
}

const columns: TableColumn<Row>[] = [
    {
        id: 'user',
        header: 'User',
        cell: ({ row }) => {
            const user = row.original.user;
            if (!user) return h('span', { class: 'text-dimmed' }, 'Deleted user');
            return h(ULink, { to: adminPath(`/users/${user.id}`), class: 'flex items-center gap-3' }, () => [
                h(UAvatar, { src: user.image ?? undefined, alt: user.name, size: 'md' }),
                h('div', { class: 'min-w-0' }, [
                    h('p', { class: 'font-medium text-highlighted truncate' }, user.name),
                    h('p', { class: 'text-muted truncate' }, user.email)
                ])
            ]);
        }
    },
    {
        id: 'device',
        header: 'Device',
        cell: ({ row }) =>
            h('div', { class: 'min-w-0' }, [
                h('p', { class: 'truncate' }, [
                    device(row.original.userAgent),
                    row.original.id === thisSession.value &&
                        h(UBadge, { label: 'You', color: 'primary', variant: 'subtle', size: 'sm', class: 'ms-1' }),
                    row.original.impersonatedBy &&
                        h(UBadge, {
                            label: 'Impersonated',
                            color: 'warning',
                            variant: 'subtle',
                            size: 'sm',
                            class: 'ms-1'
                        })
                ]),
                h('p', { class: 'text-xs text-dimmed truncate' }, row.original.ipAddress || 'Unknown IP')
            ])
    },
    {
        id: 'active',
        header: 'Last active',
        cell: ({ row }) => h(NuxtTime, { datetime: row.original.updatedAt, relative: true, title: true })
    },
    {
        id: 'started',
        header: 'Signed in',
        cell: ({ row }) => h(NuxtTime, { datetime: row.original.createdAt, dateStyle: 'medium', timeStyle: 'short' })
    },
    {
        id: 'expires',
        header: 'Expires',
        cell: ({ row }) => h(NuxtTime, { datetime: row.original.expiresAt, relative: true, title: true })
    },
    {
        id: 'actions',
        cell: ({ row }) =>
            can({ session: ['revoke'] }) && row.original.id !== thisSession.value
                ? h('div', { class: 'text-right' }, [
                      h(UButton, {
                          label: 'Sign out',
                          color: 'neutral',
                          variant: 'outline',
                          size: 'sm',
                          loadingAuto: true,
                          onClick: () => signOut(row.original)
                      })
                  ])
                : null
    }
];
</script>

<template>
    <UDashboardPanel id="sessions">
        <template #header>
            <UDashboardNavbar title="Sessions" :badge="total">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <p class="text-sm text-muted">
                Everyone signed in right now, most recently active first. "Last active" is when Better Auth last
                refreshed the session, so it can be up to a day old.
            </p>
            <UAlert
                v-if="error"
                color="error"
                icon="i-lucide-circle-alert"
                title="Couldn't load sessions"
                :description="
                    (error.data as { message?: string } | undefined)?.message || error.statusMessage || error.message
                "
            />
            <UAlert
                v-else-if="data && !data.available"
                color="neutral"
                variant="subtle"
                icon="i-lucide-info"
                description="Sessions are kept in secondary storage (eg Redis), not the database, so they can't be listed here."
            />
            <UTable
                v-else
                :data="data?.sessions ?? []"
                :columns="columns"
                :loading="status === 'pending'"
                empty="Nobody is signed in."
                class="shrink-0"
                :ui="{
                    base: 'table-fixed border-separate border-spacing-0',
                    thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                    tbody: '[&>tr]:last:[&>td]:border-b-0',
                    th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                    td: 'border-b border-default'
                }"
            />
            <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
                <div class="text-sm text-muted">{{ total }} session{{ total === 1 ? '' : 's' }}</div>
                <UPagination v-model:page="page" :items-per-page="PAGE_SIZE" :total="total" />
            </div>
        </template>
    </UDashboardPanel>
</template>
