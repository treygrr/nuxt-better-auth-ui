<script setup lang="ts">
import { computed, useBetterAuthAdminPath, useAuthCapabilities, useAuthI18n } from '#imports';

/** The sidebar's header: the app's name (Better Auth's `appName`) over "Admin", leading to the admin home. */
defineProps<{ collapsed?: boolean }>();

const adminPath = useBetterAuthAdminPath();
const { capabilities } = useAuthCapabilities();
const { t } = useAuthI18n();
const name = computed(() => capabilities.value?.appName ?? t('admin.brand.admin'));
</script>

<template>
    <ULink :to="adminPath('/')" class="flex items-center gap-2.5 min-w-0 rounded-md px-1.5 py-1.5 hover:bg-elevated/50">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-inverted font-semibold">
            {{ name.charAt(0).toUpperCase() }}
        </span>
        <span v-if="!collapsed" class="min-w-0 leading-tight">
            <span class="block truncate font-semibold text-highlighted">{{ name }}</span>
            <span class="block text-xs text-muted">{{ t('admin.brand.admin') }}</span>
        </span>
    </ULink>
</template>
