<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { computed, ref, useAdminPath, useAdminRoles, useAdminUsers, useToast } from '#imports';

import { useAdminPermissions } from '../composables/useAdminCan';
import type { AdminRole } from '../composables/useAdminRoles';
import { PERMISSIONS, TOTAL_PERMISSIONS, permissionCount } from '../utils/permissions';

const adminPath = useAdminPath();
const { roles, refresh } = useAdminRoles();
const permissions = useAdminPermissions();
// Only the admin role manages roles, so nobody can grant themselves more.
const canManage = computed(() => permissions.value?.manageRoles === true);

const labels = Object.fromEntries(
    PERMISSIONS.flatMap((group) => group.actions.map((item) => [`${group.resource}:${item.action}`, item.label]))
);
const summary = (role: AdminRole) => {
    const count = permissionCount(role.permissions);
    if (count === 0) return 'No admin permissions';
    if (count === TOTAL_PERMISSIONS) return 'Everything';
    return `${count} of ${TOTAL_PERMISSIONS} permissions`;
};
const granted = (role: AdminRole) =>
    Object.entries(role.permissions).flatMap(([resource, actions]) =>
        actions.map((action) => labels[`${resource}:${action}`] ?? `${resource}: ${action}`)
    );

const editing = ref<AdminRole | null>(null);
const editorOpen = ref(false);
const openEditor = (role: AdminRole | null) => {
    editing.value = role;
    editorOpen.value = true;
};

const admin = useAdminUsers();
const toast = useToast();
async function remove(role: AdminRole) {
    try {
        await admin.deleteRole(role.name);
        toast.add({ title: 'Role deleted', description: role.name, color: 'success' });
        await refresh();
    } catch (error) {
        toast.add({ title: `Couldn't delete ${role.name}`, description: (error as Error).message, color: 'error' });
    }
}

const items = (role: AdminRole): DropdownMenuItem[][] => [
    [
        { label: 'Edit permissions', icon: 'i-lucide-pencil', onSelect: () => openEditor(role) },
        { label: 'See users', icon: 'i-lucide-users', to: adminPath(`/users?filter=role:${role.name}`) }
    ],
    [
        {
            label: role.users ? `Delete (${role.users} still ha${role.users === 1 ? 's' : 've'} it)` : 'Delete',
            icon: 'i-lucide-trash',
            color: 'error',
            disabled: role.users > 0,
            onSelect: () => remove(role)
        }
    ]
];
</script>

<template>
    <UDashboardPanel id="roles">
        <template #header>
            <UDashboardNavbar title="Roles">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
                <template #right>
                    <UButton v-if="canManage" label="New role" icon="i-lucide-plus" @click="openEditor(null)" />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <div class="w-full lg:max-w-3xl mx-auto space-y-4">
                <p class="text-sm text-muted">
                    What each role can do in the admin pages. Roles that can see the users list open these pages.
                    <template v-if="!canManage">Only admins can change roles.</template>
                </p>

                <UPageCard v-for="role in roles" :key="role.name" variant="subtle">
                    <div class="flex items-start gap-3">
                        <div class="min-w-0 flex-1 space-y-2">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-medium text-highlighted">{{ role.name }}</span>
                                <UBadge
                                    v-if="role.builtIn"
                                    label="Built in"
                                    color="neutral"
                                    variant="subtle"
                                    size="sm"
                                />
                                <UBadge
                                    v-if="role.permissions.user?.includes('list')"
                                    label="Staff"
                                    color="primary"
                                    variant="subtle"
                                    size="sm"
                                />
                                <ULink
                                    :to="adminPath(`/users?filter=role:${role.name}`)"
                                    class="text-sm text-muted hover:text-default"
                                >
                                    {{ role.users }} user{{ role.users === 1 ? '' : 's' }}
                                </ULink>
                            </div>
                            <p class="text-sm text-muted">{{ summary(role) }}</p>
                            <ul
                                v-if="
                                    permissionCount(role.permissions) &&
                                    permissionCount(role.permissions) < TOTAL_PERMISSIONS
                                "
                                class="flex flex-wrap gap-1.5"
                            >
                                <li v-for="label in granted(role)" :key="label">
                                    <UBadge :label="label" color="neutral" variant="outline" size="sm" />
                                </li>
                            </ul>
                        </div>
                        <UDropdownMenu
                            v-if="canManage && !role.builtIn"
                            :items="items(role)"
                            :content="{ align: 'end' }"
                        >
                            <UButton
                                icon="i-lucide-ellipsis-vertical"
                                color="neutral"
                                variant="ghost"
                                :aria-label="`${role.name} actions`"
                            />
                        </UDropdownMenu>
                    </div>
                </UPageCard>
            </div>

            <AdminRolesEditModal v-model:open="editorOpen" :role="editing" @saved="refresh" />
        </template>
    </UDashboardPanel>
</template>
