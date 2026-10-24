<script setup lang="ts">
import { computed, useAdminUsers, useToast } from '#imports';

import type { AdminAccount, AdminUser } from '../../types';

const props = defineProps<{ user: AdminUser; account: AdminAccount; label: string }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ removed: [] }>();

const description = computed(() =>
    props.account.providerId === 'credential'
        ? `${props.user.name}'s password will stop working. They can still sign in another way, or set a new password with "Forgot password".`
        : `${props.user.name} won't be able to sign in with ${props.label} until they connect it again.`
);

const admin = useAdminUsers();
const toast = useToast();

async function onSubmit() {
    try {
        await admin.removeAccount(props.user.id, props.account.id);
        toast.add({ title: `${props.label} removed`, description: props.user.email, color: 'success' });
        open.value = false;
        emit('removed');
    } catch (error) {
        toast.add({ title: `Couldn't remove ${props.label}`, description: (error as Error).message, color: 'error' });
    }
}
</script>

<template>
    <UModal v-model:open="open" :title="`Remove ${label}?`" :description="description">
        <template #body>
            <div class="flex justify-end gap-2">
                <UButton label="Cancel" color="neutral" variant="subtle" @click="open = false" />
                <UButton label="Remove" color="error" loading-auto @click="onSubmit" />
            </div>
        </template>
    </UModal>
</template>
