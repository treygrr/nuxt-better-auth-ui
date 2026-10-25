<script setup lang="ts">
import { computed, h, resolveComponent, useAdminPath, useAuthI18n, useFetch } from '#imports';
import type { TableColumn } from '@nuxt/ui';

import type { AdminUser } from '../../types';

const UAvatar = resolveComponent('UAvatar');
const UBadge = resolveComponent('UBadge');
const ULink = resolveComponent('ULink');
const NuxtTime = resolveComponent('NuxtTime');

const adminPath = useAdminPath();
const { t } = useAuthI18n();

// The newest users, from Better Auth's own list-users.
const { data } = await useFetch<{ users: AdminUser[]; total: number }>('/api/auth/admin/list-users', {
    query: { limit: 5, sortBy: 'createdAt', sortDirection: 'desc' }
});

const columns = computed<TableColumn<AdminUser>[]>(() => [
    {
        accessorKey: 'name',
        header: t('admin.home.newUsers'),
        cell: ({ row }) =>
            h(ULink, { to: adminPath(`/users/${row.original.id}`), class: 'flex items-center gap-3' }, () => [
                h(UAvatar, { src: row.original.image ?? undefined, alt: row.original.name, size: 'md' }),
                h('div', { class: 'min-w-0' }, [
                    h('p', { class: 'font-medium text-highlighted truncate' }, row.original.name),
                    h('p', { class: 'text-muted truncate' }, row.original.email)
                ])
            ])
    },
    {
        accessorKey: 'createdAt',
        header: t('admin.common.joined'),
        cell: ({ row }) =>
            h(NuxtTime, {
                datetime: row.original.createdAt,
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
    },
    {
        accessorKey: 'emailVerified',
        header: t('admin.common.email'),
        cell: ({ row }) =>
            row.original.emailVerified
                ? h(UBadge, { label: t('admin.common.verified'), color: 'success', variant: 'subtle' })
                : h(UBadge, { label: t('admin.common.unverified'), color: 'warning', variant: 'subtle' })
    }
]);
</script>

<template>
    <UTable
        :data="data?.users ?? []"
        :columns="columns"
        class="shrink-0"
        :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
            td: 'border-b border-default'
        }"
    />
</template>
