<script setup lang="ts">
import { computed, useAdminUsers, useAuthI18n, useToast } from '#imports';

import type { AdminAccount, AdminUser } from '../../types';

const props = defineProps<{ user: AdminUser; account: AdminAccount; label: string }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ removed: [] }>();

const { t } = useAuthI18n();
const description = computed(() =>
    props.account.providerId === 'credential'
        ? t('admin.modals.removeAccount.credential', { name: props.user.name })
        : t('admin.modals.removeAccount.other', { name: props.user.name, provider: props.label })
);

const admin = useAdminUsers();
const toast = useToast();

async function onSubmit() {
    try {
        await admin.removeAccount(props.user.id, props.account.id);
        toast.add({
            title: t('admin.modals.removeAccount.removed', { provider: props.label }),
            description: props.user.email,
            color: 'success'
        });
        open.value = false;
        emit('removed');
    } catch (error) {
        toast.add({
            title: t('admin.modals.removeAccount.failed', { provider: props.label }),
            description: (error as Error).message,
            color: 'error'
        });
    }
}
</script>

<template>
    <UModal
        v-model:open="open"
        :title="t('admin.modals.removeAccount.title', { provider: label })"
        :description="description"
    >
        <template #body>
            <div class="flex justify-end gap-2">
                <UButton :label="t('admin.common.cancel')" color="neutral" variant="subtle" @click="open = false" />
                <UButton :label="t('admin.common.remove')" color="error" loading-auto @click="onSubmit" />
            </div>
        </template>
    </UModal>
</template>
