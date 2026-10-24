<script setup lang="ts">
import { useBetterAuthAdminConfig } from '#imports';

const { route } = useBetterAuthAdminConfig();
</script>

<template>
    <UDashboardPanel id="better-auth-admin-overview">
        <template #header>
            <UDashboardNavbar title="Overview">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <UPageCard
                title="Users"
                description="Search users and manage their roles, bans and sessions."
                icon="i-lucide-users"
                :to="`${route}/users`"
            />
        </template>
    </UDashboardPanel>
</template>
