<script setup lang="ts">
import { computed, reactive, ref, useAdminUsers, useToast, watch } from '#imports';

import type { AdminRole } from '../../composables/useAdminRoles';
import { PERMISSIONS } from '../../utils/permissions';

/** Creates a role, or edits one's permissions when `role` is given. */
const props = defineProps<{ role?: AdminRole | null }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ saved: [] }>();

const name = ref('');
const selected = reactive<Record<string, string[]>>({});
watch(open, (isOpen) => {
    if (!isOpen) return;
    name.value = props.role?.name ?? '';
    for (const { resource } of PERMISSIONS) selected[resource] = [...(props.role?.permissions[resource] ?? [])];
});

const toggle = (resource: string, action: string, on: boolean) => {
    const actions = selected[resource] ?? [];
    selected[resource] = on ? [...new Set([...actions, action])] : actions.filter((item) => item !== action);
};
const canOpenPages = computed(() => selected.user?.includes('list') ?? false);

const admin = useAdminUsers();
const toast = useToast();

async function onSubmit() {
    const permissions = Object.fromEntries(Object.entries(selected).filter(([, actions]) => actions.length));
    try {
        if (props.role) await admin.updateRole(props.role.name, permissions);
        else await admin.createRole(name.value.trim(), permissions);
        toast.add({ title: props.role ? 'Role updated' : 'Role created', description: name.value, color: 'success' });
        open.value = false;
        emit('saved');
    } catch (error) {
        toast.add({ title: "Couldn't save the role", description: (error as Error).message, color: 'error' });
    }
}
</script>

<template>
    <UModal
        v-model:open="open"
        :title="role ? `Edit ${role.name}` : 'New role'"
        description="What people with this role can do in the admin pages. Better Auth enforces it."
    >
        <template #body>
            <form class="space-y-6" @submit.prevent="onSubmit">
                <UFormField v-if="!role" label="Name" help="Letters, numbers, - and _. Eg moderator, support." required>
                    <UInput v-model="name" class="w-full" placeholder="moderator" pattern="[\w-]{1,40}" required />
                </UFormField>

                <fieldset v-for="group in PERMISSIONS" :key="group.resource" class="space-y-2">
                    <legend class="text-sm font-medium text-highlighted mb-2">{{ group.label }}</legend>
                    <UCheckbox
                        v-for="item in group.actions"
                        :key="item.action"
                        :model-value="selected[group.resource]?.includes(item.action) ?? false"
                        :label="item.label"
                        @update:model-value="toggle(group.resource, item.action, $event === true)"
                    />
                </fieldset>

                <UAlert
                    v-if="!canOpenPages"
                    color="warning"
                    variant="subtle"
                    icon="i-lucide-info"
                    description="Without “See the users list”, this role can't open the admin pages."
                />

                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="subtle" @click="open = false" />
                    <UButton :label="role ? 'Save' : 'Create role'" type="submit" loading-auto />
                </div>
            </form>
        </template>
    </UModal>
</template>
