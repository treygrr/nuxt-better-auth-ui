<script setup lang="ts">
import { h, resolveComponent, useAdminPath, useAdminUsers, useAsyncData } from '#imports';
import type { TableColumn } from '@nuxt/ui';

import type { AdminUser } from '../../types';

const UAvatar = resolveComponent('UAvatar');
const UBadge = resolveComponent('UBadge');
const ULink = resolveComponent('ULink');

const adminPath = useAdminPath();
const admin = useAdminUsers();

// The newest users, from Better Auth's own list-users.
const { data } = await useAsyncData(
    'better-auth-admin-recent-users',
    () => admin.list({ limit: 5, offset: 0, sortBy: 'createdAt', sortDirection: 'desc' }),
    { server: false }
);

const columns: TableColumn<AdminUser>[] = [
    {
        accessorKey: 'name',
        header: 'New users',
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
        header: 'Joined',
        cell: ({ row }) =>
            new Date(row.original.createdAt).toLocaleString('en-US', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
    },
    {
        accessorKey: 'emailVerified',
        header: 'Email',
        cell: ({ row }) =>
            row.original.emailVerified
                ? h(UBadge, { label: 'Verified', color: 'success', variant: 'subtle' })
                : h(UBadge, { label: 'Unverified', color: 'warning', variant: 'subtle' })
    }
];
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
