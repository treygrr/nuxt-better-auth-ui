<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { computed, useBetterAuthAdminConfig } from '#imports';

const { route } = useBetterAuthAdminConfig();

const items = computed<NavigationMenuItem[]>(() => [
    { label: 'Overview', icon: 'i-lucide-layout-dashboard', to: route, exact: true },
    { label: 'Users', icon: 'i-lucide-users', to: `${route}/users` }
]);
</script>

<template>
    <UDashboardGroup>
        <UDashboardSidebar collapsible>
            <template #header="{ collapsed }">
                <span v-if="!collapsed" class="font-semibold">Admin</span>
                <UIcon v-else name="i-lucide-shield" class="size-5" />
            </template>

            <template #default="{ collapsed }">
                <UNavigationMenu :items="items" :collapsed="collapsed" orientation="vertical" />
            </template>

            <template #footer="{ collapsed }">
                <UButton
                    to="/"
                    icon="i-lucide-arrow-left"
                    :label="collapsed ? undefined : 'Back to site'"
                    color="neutral"
                    variant="ghost"
                    block
                />
            </template>
        </UDashboardSidebar>

        <slot />
    </UDashboardGroup>
</template>
