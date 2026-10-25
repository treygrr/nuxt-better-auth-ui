<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import { refDebounced } from '@vueuse/core';
import { computed, h, ref, resolveComponent, useAdminPath, useAuthI18n, useFetch, watch } from '#imports';

import { ADMIN_API } from '../../../constants';
import type { AdminOrganization } from '../../../server/api/organizations/index.get';

/** Every organization (Better Auth's Organization plugin), for staff: read-only, a page at a time. */
const UAvatar = resolveComponent('UAvatar');
const ULink = resolveComponent('ULink');
const NuxtTime = resolveComponent('NuxtTime');

const adminPath = useAdminPath();
const { t } = useAuthI18n();

const page = ref(1);
const search = ref('');
const term = refDebounced(search, 300);
watch(term, () => {
    page.value = 1;
});
const { data, status, error } = await useFetch<{ organizations: AdminOrganization[]; total: number; pageSize: number }>(
    `${ADMIN_API}/organizations`,
    { query: computed(() => ({ page: page.value, search: term.value.trim() || undefined })) }
);
const total = computed(() => data.value?.total ?? 0);

const columns = computed<TableColumn<AdminOrganization>[]>(() => [
    {
        accessorKey: 'name',
        header: t('admin.organizations.columns.name'),
        cell: ({ row }) =>
            h('div', { class: 'flex items-center gap-3' }, [
                h(UAvatar, { src: row.original.logo ?? undefined, alt: row.original.name, size: 'md' }),
                h('div', undefined, [
                    h(
                        ULink,
                        {
                            to: adminPath(`/organizations/${row.original.id}`),
                            class: 'font-medium text-highlighted hover:underline'
                        },
                        () => row.original.name
                    ),
                    h('p', { class: 'text-muted' }, row.original.slug)
                ])
            ])
    },
    {
        accessorKey: 'members',
        header: t('admin.organizations.columns.members'),
        cell: ({ row }) => String(row.original.members)
    },
    {
        accessorKey: 'createdAt',
        header: t('admin.organizations.columns.created'),
        cell: ({ row }) => h(NuxtTime, { datetime: row.original.createdAt, dateStyle: 'medium' })
    }
]);
</script>

<template>
    <UDashboardPanel id="organizations">
        <template #header>
            <UDashboardNavbar :title="t('admin.organizations.title')" :badge="total">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <p class="text-sm text-muted">{{ t('admin.organizations.intro') }}</p>
            <UInput
                v-model="search"
                icon="i-lucide-search"
                :placeholder="t('admin.organizations.search')"
                class="max-w-sm"
            />
            <UAlert
                v-if="error"
                color="error"
                icon="i-lucide-circle-alert"
                :title="t('admin.organizations.loadFailed')"
                :description="error.statusMessage || error.message"
            />
            <UTable
                v-else
                :data="data?.organizations ?? []"
                :columns="columns"
                :loading="status === 'pending'"
                :empty="t('admin.organizations.empty')"
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
                    {{
                        t(total === 1 ? 'admin.organizations.count.one' : 'admin.organizations.count.other', {
                            count: total
                        })
                    }}
                </div>
                <UPagination v-model:page="page" :items-per-page="data?.pageSize ?? 20" :total="total" />
            </div>
        </template>
    </UDashboardPanel>
</template>
