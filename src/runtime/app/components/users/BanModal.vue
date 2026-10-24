<script setup lang="ts">
import { computed, ref, useAdminUsers, useToast, watch } from '#imports';

import type { AdminUser } from '../../types';

const props = defineProps<{ users: AdminUser[] }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ banned: [] }>();

const HOUR = 60 * 60;
const durations = [
    { label: 'Until unbanned', value: 0 },
    { label: '1 hour', value: HOUR },
    { label: '1 day', value: 24 * HOUR },
    { label: '7 days', value: 7 * 24 * HOUR },
    { label: '30 days', value: 30 * 24 * HOUR }
];

const reason = ref('');
const duration = ref(0);
watch(open, (isOpen) => {
    if (isOpen) {
        reason.value = '';
        duration.value = 0;
    }
});

const title = computed(() =>
    props.users.length === 1 ? `Ban ${props.users[0]!.name}` : `Ban ${props.users.length} users`
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
            title: `Couldn't ban ${failed.length} of ${props.users.length}`,
            description: (failed[0]!.reason as Error).message,
            color: 'error'
        });
    } else {
        toast.add({
            title: props.users.length === 1 ? 'User banned' : `${props.users.length} users banned`,
            color: 'success'
        });
    }
    open.value = false;
    emit('banned');
}
</script>

<template>
    <UModal
        v-model:open="open"
        :title="title"
        description="They're signed out everywhere and can't sign in until the ban ends."
    >
        <template #body>
            <div class="space-y-4">
                <UFormField label="Reason" help="Optional. Shown to them when they try to sign in.">
                    <UInput v-model="reason" class="w-full" />
                </UFormField>
                <UFormField label="Duration">
                    <USelect v-model="duration" :items="durations" class="w-full" />
                </UFormField>
                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="subtle" @click="open = false" />
                    <UButton label="Ban" color="error" loading-auto @click="onSubmit" />
                </div>
            </div>
        </template>
    </UModal>
</template>
