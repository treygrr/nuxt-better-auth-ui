<script setup lang="ts">
import { computed, ref, useAdminUsers, useAuthI18n, useToast, watch } from '#imports';

import type { AdminUser } from '../../types';

const props = defineProps<{ users: AdminUser[] }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ banned: [] }>();

const { t } = useAuthI18n();
const HOUR = 60 * 60;
const durations = computed(() => [
    { label: t('admin.modals.ban.durations.untilUnbanned'), value: 0 },
    { label: t('admin.modals.ban.durations.oneHour'), value: HOUR },
    { label: t('admin.modals.ban.durations.oneDay'), value: 24 * HOUR },
    { label: t('admin.modals.ban.durations.sevenDays'), value: 7 * 24 * HOUR },
    { label: t('admin.modals.ban.durations.thirtyDays'), value: 30 * 24 * HOUR }
]);

const reason = ref('');
const duration = ref(0);
watch(open, (isOpen) => {
    if (isOpen) {
        reason.value = '';
        duration.value = 0;
    }
});

const title = computed(() =>
    props.users.length === 1
        ? t('admin.modals.ban.titleOne', { name: props.users[0]!.name })
        : t('admin.modals.ban.titleMany', { count: props.users.length })
);

const admin = useAdminUsers();
const toast = useToast();

async function onSubmit() {
    const results = await Promise.allSettled(
        props.users.map((user) => admin.ban(user.id, reason.value || undefined, duration.value || undefined))
    );
    const failed = results.filter((result) => result.status === 'rejected') as PromiseRejectedResult[];
    if (failed.length) {
        toast.add({
            title: t('admin.modals.ban.failed', { failed: failed.length, total: props.users.length }),
            description: (failed[0]!.reason as Error).message,
            color: 'error'
        });
    } else {
        toast.add({
            title:
                props.users.length === 1
                    ? t('admin.modals.ban.bannedOne')
                    : t('admin.modals.ban.bannedMany', { count: props.users.length }),
            color: 'success'
        });
    }
    open.value = false;
    emit('banned');
}
</script>

<template>
    <UModal v-model:open="open" :title="title" :description="t('admin.modals.ban.description')">
        <template #body>
            <div class="space-y-4">
                <UFormField :label="t('admin.modals.ban.reason')" :help="t('admin.modals.ban.reasonHelp')">
                    <UInput v-model="reason" class="w-full" />
                </UFormField>
                <UFormField :label="t('admin.modals.ban.duration')">
                    <USelect v-model="duration" :items="durations" class="w-full" />
                </UFormField>
                <div class="flex justify-end gap-2">
                    <UButton :label="t('admin.common.cancel')" color="neutral" variant="subtle" @click="open = false" />
                    <UButton :label="t('admin.common.ban')" color="error" loading-auto @click="onSubmit" />
                </div>
            </div>
        </template>
    </UModal>
</template>
