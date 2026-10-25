<script setup lang="ts">
import { computed, useAdminUsers, useAuthI18n, useToast } from '#imports';

import type { AdminUser } from '../../types';

const props = defineProps<{ users: AdminUser[] }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ deleted: [] }>();

const { t } = useAuthI18n();
const title = computed(() =>
    props.users.length === 1
        ? t('admin.modals.delete.titleOne', { name: props.users[0]!.name })
        : t('admin.modals.delete.titleMany', { count: props.users.length })
);

const admin = useAdminUsers();
const toast = useToast();

async function onSubmit() {
    const results = await Promise.allSettled(props.users.map((user) => admin.remove(user.id)));
    const failed = results.filter((result) => result.status === 'rejected') as PromiseRejectedResult[];
    if (failed.length) {
        toast.add({
            title: t('admin.modals.delete.failed', { failed: failed.length, total: props.users.length }),
            description: (failed[0]!.reason as Error).message,
            color: 'error'
        });
    } else {
        toast.add({
            title:
                props.users.length === 1
                    ? t('admin.modals.delete.deletedOne')
                    : t('admin.modals.delete.deletedMany', { count: props.users.length }),
            color: 'success'
        });
    }
    open.value = false;
    emit('deleted');
}
</script>

<template>
    <UModal v-model:open="open" :title="title" :description="t('admin.modals.delete.description')">
        <template #body>
            <div class="flex justify-end gap-2">
                <UButton :label="t('admin.common.cancel')" color="neutral" variant="subtle" @click="open = false" />
                <UButton :label="t('admin.common.delete')" color="error" loading-auto @click="onSubmit" />
            </div>
        </template>
    </UModal>
</template>
