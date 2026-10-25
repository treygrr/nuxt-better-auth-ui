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
    useAuthI18n,
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
const { t } = useAuthI18n();

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
        toast.add({ title: t('admin.common.sessionSignedOut'), description: row.user?.email, color: 'success' });
        await refresh();
    } catch (failure) {
        toast.add({
            title: t('admin.sessions.signOutFailed'),
            description: (failure as Error).message,
            color: 'error'
        });
    }
}

const columns = computed<TableColumn<Row>[]>(() => [
    {
        id: 'user',
        header: t('admin.sessions.columns.user'),
        cell: ({ row }) => {
            const user = row.original.user;
            if (!user) return h('span', { class: 'text-dimmed' }, t('admin.sessions.deletedUser'));
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
        header: t('admin.sessions.columns.device'),
        cell: ({ row }) =>
            h('div', { class: 'min-w-0' }, [
                h('p', { class: 'truncate' }, [
                    device(row.original.userAgent, t),
                    row.original.id === thisSession.value &&
                        h(UBadge, {
                            label: t('admin.common.you'),
                            color: 'primary',
                            variant: 'subtle',
                            size: 'sm',
                            class: 'ms-1'
                        }),
                    row.original.impersonatedBy &&
                        h(UBadge, {
                            label: t('admin.common.impersonated'),
                            color: 'warning',
                            variant: 'subtle',
                            size: 'sm',
                            class: 'ms-1'
                        })
                ]),
                h('p', { class: 'text-xs text-dimmed truncate' }, row.original.ipAddress || t('admin.common.unknownIp'))
            ])
    },
    {
        id: 'active',
        header: t('admin.common.lastActive'),
        cell: ({ row }) => h(NuxtTime, { datetime: row.original.updatedAt, relative: true, title: true })
    },
    {
        id: 'started',
        header: t('admin.sessions.columns.signedIn'),
        cell: ({ row }) => h(NuxtTime, { datetime: row.original.createdAt, dateStyle: 'medium', timeStyle: 'short' })
    },
    {
        id: 'expires',
        header: t('admin.sessions.columns.expires'),
        cell: ({ row }) => h(NuxtTime, { datetime: row.original.expiresAt, relative: true, title: true })
    },
    {
        id: 'actions',
        cell: ({ row }) =>
            can({ session: ['revoke'] }) && row.original.id !== thisSession.value
                ? h('div', { class: 'text-right' }, [
                      h(UButton, {
                          label: t('admin.common.signOut'),
                          color: 'neutral',
                          variant: 'outline',
                          size: 'sm',
                          loadingAuto: true,
                          onClick: () => signOut(row.original)
                      })
                  ])
                : null
    }
]);
</script>

<template>
    <UDashboardPanel id="sessions">
        <template #header>
            <UDashboardNavbar :title="t('admin.sessions.title')" :badge="total">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <p class="text-sm text-muted">
                {{ t('admin.sessions.intro') }}
            </p>
            <UAlert
                v-if="error"
                color="error"
                icon="i-lucide-circle-alert"
                :title="t('admin.sessions.loadFailed')"
                :description="
                    (error.data as { message?: string } | undefined)?.message || error.statusMessage || error.message
                "
            />
            <UAlert
                v-else-if="data && !data.available"
                color="neutral"
                variant="subtle"
                icon="i-lucide-info"
                :description="t('admin.sessions.secondaryStorage')"
            />
            <UTable
                v-else
                :data="data?.sessions ?? []"
                :columns="columns"
                :loading="status === 'pending'"
                :empty="t('admin.sessions.empty')"
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
                <div class="text-sm text-muted">
                    {{ t(total === 1 ? 'admin.sessions.count.one' : 'admin.sessions.count.other', { count: total }) }}
                </div>
                <UPagination v-model:page="page" :items-per-page="PAGE_SIZE" :total="total" />
            </div>
        </template>
    </UDashboardPanel>
</template>
