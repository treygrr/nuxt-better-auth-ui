<script setup lang="ts">
import { useBetterAuthAdminConfig, useRoute } from '#imports';

const { route } = useBetterAuthAdminConfig();
const userId = useRoute().params.id as string;
</script>

<template>
    <UDashboardPanel id="better-auth-admin-user">
        <template #header>
            <UDashboardNavbar title="User">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
                <template #right>
                    <UButton :to="`${route}/users`" icon="i-lucide-arrow-left" label="Users" variant="ghost" />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <!-- Scaffold: role, ban, password, sessions and delete actions come next. -->
            <UAlert
                icon="i-lucide-construction"
                title="Coming soon"
                :description="`User management for ${userId} isn't built yet.`"
            />
        </template>
    </UDashboardPanel>
</template>
