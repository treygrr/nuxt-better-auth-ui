<script setup lang="ts">
import { computed, ref, useAdminPath, useBetterAuthAdminConfig, useFetch, useRoute, watch } from '#imports';

import { ADMIN_API } from '../../constants';
import type { AdminAuditEntry } from '../types';
import { AUDIT_ACTIONS } from '../utils/audit';

const PAGE_SIZE = 25;
const adminPath = useAdminPath();
const { auditLogRetentionDays } = useBetterAuthAdminConfig();
const kept = auditLogRetentionDays > 0 ? `Kept for ${auditLogRetentionDays} days.` : 'Kept forever.';
const route = useRoute();
// From a user's page: only entries where they acted or were acted on.
const userId = computed(() => (typeof route.query.userId === 'string' ? route.query.userId : undefined));
const page = ref(1);
const action = ref('all');
watch(action, () => {
    page.value = 1;
});

const actions = [
    { label: 'All actions', value: 'all' },
    ...Object.entries(AUDIT_ACTIONS).map(([value, { label, icon }]) => ({ label, value, icon }))
];

// Fetched during server rendering and refetched as the filters change.
const { data, status, error } = await useFetch<{ entries: AdminAuditEntry[]; total: number }>(`${ADMIN_API}/audit`, {
    query: computed(() => ({
        limit: PAGE_SIZE,
        offset: (page.value - 1) * PAGE_SIZE,
        action: action.value === 'all' ? undefined : action.value,
        userId: userId.value
    }))
});
const total = computed(() => data.value?.total ?? 0);
</script>

<template>
    <UDashboardPanel id="audit">
        <template #header>
            <UDashboardNavbar title="Audit log">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <div class="flex flex-wrap items-center justify-between gap-1.5">
                <p v-if="userId" class="text-sm text-muted">
                    Entries for
                    <ULink :to="adminPath(`/users/${userId}`)" class="text-highlighted">one user</ULink>.
                    <ULink :to="adminPath('/audit')" class="text-primary">Show everyone</ULink>
                </p>
                <p v-else class="text-sm text-muted">Every change an admin made to a user, newest first. {{ kept }}</p>
                <USelect
                    v-model="action"
                    :items="actions"
                    aria-label="Action"
                    :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
                    class="min-w-48"
                />
            </div>

            <UAlert
                v-if="error"
                color="error"
                icon="i-lucide-circle-alert"
                title="Couldn't load the audit log"
                :description="
                    (error.data as { message?: string } | undefined)?.message || error.statusMessage || error.message
                "
            />
            <AdminAuditLogTable v-else :entries="data?.entries ?? []" :loading="status === 'pending'" />

            <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
                <div class="text-sm text-muted">{{ total }} entr{{ total === 1 ? 'y' : 'ies' }}</div>
                <UPagination v-model:page="page" :items-per-page="PAGE_SIZE" :total="total" />
            </div>
        </template>
    </UDashboardPanel>
</template>
