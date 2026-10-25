<script setup lang="ts">
import { computed, ref, useAdminUsers, useAdminRoles, useBetterAuthAdminConfig, useToast, watch } from '#imports';

import type { AdminUser } from '../../types';

const props = defineProps<{ user: AdminUser }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ updated: [] }>();

const { role: adminRole } = useBetterAuthAdminConfig();
const { names: allRoles } = useAdminRoles();
// The configured roles, plus theirs if it's no longer configured.
const roles = computed(() => [...new Set([...allRoles.value, props.user.role ?? 'user'])]);
const role = ref('user');
watch(open, (isOpen) => {
    if (isOpen) role.value = props.user.role ?? 'user';
});

const users = useAdminUsers();
const toast = useToast();

async function onSubmit() {
    try {
        await users.setRole(props.user.id, role.value);
        toast.add({ title: 'Role changed', description: `${props.user.name} is now ${role.value}`, color: 'success' });
        open.value = false;
        emit('updated');
    } catch (error) {
        toast.add({ title: "Couldn't change the role", description: (error as Error).message, color: 'error' });
    }
}
</script>

<template>
    <UModal v-model:open="open" title="Change role" :description="user.email">
        <template #body>
            <div class="space-y-4">
                <UFormField
                    label="Role"
                    :help="`${adminRole} can do everything here; other roles only what they're allowed.`"
                >
                    <USelect v-model="role" :items="roles" class="w-full" />
                </UFormField>
                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="subtle" @click="open = false" />
                    <UButton label="Save" loading-auto @click="onSubmit" />
                </div>
            </div>
        </template>
    </UModal>
</template>
