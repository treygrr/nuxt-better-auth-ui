<script setup lang="ts">
import { computed, useAdminUsers, useToast } from '#imports';

import type { AdminUser } from '../../types';

const props = defineProps<{ users: AdminUser[] }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ deleted: [] }>();

const title = computed(() =>
    props.users.length === 1 ? `Delete ${props.users[0]!.name}` : `Delete ${props.users.length} users`
);

const admin = useAdminUsers();
const toast = useToast();

async function onSubmit() {
    const results = await Promise.allSettled(props.users.map((user) => admin.remove(user.id)));
    const failed = results.filter((result) => result.status === 'rejected') as PromiseRejectedResult[];
    if (failed.length) {
        toast.add({
            title: `Couldn't delete ${failed.length} of ${props.users.length}`,
            description: (failed[0]!.reason as Error).message,
            color: 'error'
        });
    } else {
        toast.add({
            title: props.users.length === 1 ? 'User deleted' : `${props.users.length} users deleted`,
            color: 'success'
        });
    }
    open.value = false;
    emit('deleted');
}
</script>

<template>
    <UModal
        v-model:open="open"
        :title="title"
        description="Their account, sessions and sign-in methods are removed. This can't be undone."
    >
        <template #body>
            <div class="flex justify-end gap-2">
                <UButton label="Cancel" color="neutral" variant="subtle" @click="open = false" />
                <UButton label="Delete" color="error" loading-auto @click="onSubmit" />
            </div>
        </template>
    </UModal>
</template>
