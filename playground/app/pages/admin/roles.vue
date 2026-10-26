<script setup lang="ts">
// The app's own admin page: under the admin route, so it gets the admin layout and is for staff only. The page meta
// adds it to the sidebar and search, for roles that can set roles (not moderators).
definePageMeta({
    betterAuthAdmin: { label: 'Roles', icon: 'i-lucide-pie-chart', permissions: { user: ['set-role'] } }
});
useSeoMeta({ title: 'Roles' });

const { data } = await useFetch('/api/reports/roles', { default: () => [] });
</script>

<template>
    <UDashboardPanel id="roles">
        <template #header>
            <UDashboardNavbar title="Roles">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <UPageGrid>
                <UPageCard v-for="row in data" :key="row.role" :title="String(row.users)" :description="row.role" />
            </UPageGrid>
        </template>
    </UDashboardPanel>
</template>
