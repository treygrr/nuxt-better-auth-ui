<script setup lang="ts">
import {
    computed,
    ref,
    useBetterAuthAdminUsers,
    useAuthI18n,
    useBetterAuthAdminConfig,
    useToast,
    watch
} from '#imports';

import type { AdminUser } from '../../types';

const props = defineProps<{ user: AdminUser }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ updated: [] }>();

const { role: adminRole, roles: allRoles } = useBetterAuthAdminConfig();
// The configured roles, plus theirs if it's no longer configured.
const roles = computed(() => [...new Set([...allRoles, props.user.role ?? 'user'])]);
const role = ref('user');
watch(open, (isOpen) => {
    if (isOpen) role.value = props.user.role ?? 'user';
});

const users = useBetterAuthAdminUsers();
const toast = useToast();
const { t } = useAuthI18n();

async function onSubmit() {
    try {
        await users.setRole(props.user.id, role.value);
        toast.add({
            title: t('admin.modals.role.changed'),
            description: t('admin.modals.role.now', { name: props.user.name, role: role.value }),
            color: 'success'
        });
        open.value = false;
        emit('updated');
    } catch (error) {
        toast.add({ title: t('admin.modals.role.failed'), description: (error as Error).message, color: 'error' });
    }
}
</script>

<template>
    <UModal v-model:open="open" :title="t('admin.common.changeRole')" :description="user.email">
        <template #body>
            <div class="space-y-4">
                <UFormField :label="t('admin.common.role')" :help="t('admin.modals.role.help', { role: adminRole })">
                    <USelect v-model="role" :items="roles" class="w-full" />
                </UFormField>
                <div class="flex justify-end gap-2">
                    <UButton :label="t('admin.common.cancel')" color="neutral" variant="subtle" @click="open = false" />
                    <UButton :label="t('admin.common.save')" loading-auto @click="onSubmit" />
                </div>
            </div>
        </template>
    </UModal>
</template>
