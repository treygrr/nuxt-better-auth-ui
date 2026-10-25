<script setup lang="ts">
import { computed, h, resolveComponent, useAdminPath } from '#imports';
import type { TableColumn } from '@nuxt/ui';

import type { AdminAuditEntry } from '../types';
import { auditAction, auditDetails } from '../utils/audit';

const props = defineProps<{
    entries: AdminAuditEntry[];
    loading?: boolean;
    /** On a user's page: hides the User column while every entry is about them. */
    userId?: string;
}>();

const columnVisibility = computed(() => ({
    target: !props.userId || props.entries.some((entry) => entry.targetId !== props.userId)
}));

const UBadge = resolveComponent('UBadge');
const ULink = resolveComponent('ULink');
const NuxtTime = resolveComponent('NuxtTime');
const adminPath = useAdminPath();

/** A person as recorded, linking to their page; their account may since have been deleted. */
const person = (id: string | null, name: string | null, email: string | null) =>
    id
        ? h('div', { class: 'min-w-0' }, [
              h(
                  ULink,
                  { to: adminPath(`/users/${id}`), class: 'font-medium text-highlighted truncate block' },
                  () => name
              ),
              h('p', { class: 'text-muted truncate' }, email ?? '')
          ])
        : h('span', { class: 'text-dimmed' }, '—');

const columns: TableColumn<AdminAuditEntry>[] = [
    {
        accessorKey: 'createdAt',
        header: 'When',
        cell: ({ row }) =>
            // Relative, with the full date and time as its title.
            h(NuxtTime, { datetime: row.original.createdAt, relative: true, title: true, class: 'whitespace-nowrap' })
    },
    {
        id: 'actor',
        header: 'Admin',
        cell: ({ row }) => person(row.original.actorId, row.original.actorName, row.original.actorEmail)
    },
    {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => {
            const action = auditAction(row.original.action);
            return h(UBadge, { label: action.label, icon: action.icon, color: action.color, variant: 'subtle' });
        }
    },
    {
        id: 'target',
        header: 'User',
        cell: ({ row }) => person(row.original.targetId, row.original.targetName, row.original.targetEmail)
    },
    {
        id: 'details',
        header: 'Details',
        cell: ({ row }) =>
            h('div', { class: 'min-w-0' }, [
                h('p', { class: 'truncate' }, auditDetails(row.original) || '—'),
                row.original.ipAddress && h('p', { class: 'text-xs text-dimmed truncate' }, row.original.ipAddress)
            ])
    }
];
</script>

<template>
    <UTable
        :data="entries"
        :columns="columns"
        :loading="loading"
        :column-visibility="columnVisibility"
        class="shrink-0"
        empty="Nothing recorded yet."
        :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
            td: 'border-b border-default'
        }"
    />
</template>
