<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import { useAuthClient } from '@nuxtjs/better-auth/composables';
import { ref, useAsyncData, useBetterAuthAdminConfig, watch } from '#imports';

type AdminUser = {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    banned?: boolean | null;
    emailVerified: boolean;
    createdAt: string | Date;
};

const { route } = useBetterAuthAdminConfig();
const PAGE_SIZE = 20;

const search = ref('');
const page = ref(1);
watch(search, () => {
    page.value = 1;
});

// The admin client plugin is added by the module, so the app's typed client doesn't know about it.
const admin = () => (useAuthClient() as unknown as { admin: { listUsers: Function } }).admin;

const { data, status, error } = await useAsyncData(
    'better-auth-admin-users',
    async () => {
        const result = await admin().listUsers({
            query: {
                limit: PAGE_SIZE,
                offset: (page.value - 1) * PAGE_SIZE,
                sortBy: 'createdAt',
                sortDirection: 'desc',
                ...(search.value && { searchValue: search.value, searchField: 'email', searchOperator: 'contains' })
            }
        });
        if (result.error) throw new Error(result.error.message);
        return result.data as { users: AdminUser[]; total: number };
    },
    { server: false, watch: [page, search] }
);

const columns: TableColumn<AdminUser>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'role', header: 'Role' },
    { accessorKey: 'emailVerified', header: 'Verified' },
    { accessorKey: 'banned', header: 'Banned' },
    { accessorKey: 'createdAt', header: 'Joined' }
];
</script>

<template>
    <UDashboardPanel id="better-auth-admin-users">
        <template #header>
            <UDashboardNavbar title="Users">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
            <UDashboardToolbar>
                <UInput v-model="search" icon="i-lucide-search" placeholder="Search by email" />
            </UDashboardToolbar>
        </template>

        <template #body>
            <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" :description="error.message" />

            <UTable :data="data?.users ?? []" :columns="columns" :loading="status === 'pending'">
                <template #name-cell="{ row }">
                    <ULink :to="`${route}/users/${row.original.id}`" class="font-medium">
                        {{ row.original.name }}
                    </ULink>
                </template>
                <template #role-cell="{ row }">
                    <UBadge :label="row.original.role ?? 'user'" color="neutral" variant="subtle" />
                </template>
                <template #emailVerified-cell="{ row }">
                    <UIcon v-if="row.original.emailVerified" name="i-lucide-check" />
                </template>
                <template #banned-cell="{ row }">
                    <UBadge v-if="row.original.banned" label="Banned" color="error" variant="subtle" />
                </template>
                <template #createdAt-cell="{ row }">
                    {{ new Date(row.original.createdAt).toLocaleDateString() }}
                </template>
            </UTable>

            <UPagination
                v-if="(data?.total ?? 0) > PAGE_SIZE"
                v-model:page="page"
                :total="data?.total ?? 0"
                :items-per-page="PAGE_SIZE"
            />
        </template>
    </UDashboardPanel>
</template>
