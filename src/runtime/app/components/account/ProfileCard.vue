<script setup lang="ts">
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { reactive, ref, useToast, watch } from '#imports';

import CardTitle from './CardTitle.vue';

/** Name and avatar, through Better Auth's updateUser. */
const { user, updateUser } = useUserSession();
const toast = useToast();

const state = reactive({ name: '', image: '' });
watch(
    user,
    (current) => {
        state.name = current?.name ?? '';
        state.image = current?.image ?? '';
    },
    { immediate: true }
);
const saving = ref(false);

async function save() {
    saving.value = true;
    try {
        await updateUser({ name: state.name.trim(), image: state.image.trim() || null });
        toast.add({ title: 'Profile saved', color: 'success' });
    } catch (error) {
        toast.add({ title: "Couldn't save your profile", description: (error as Error).message, color: 'error' });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <UPageCard title="Profile" description="How you appear to others." variant="subtle">
        <template #title><CardTitle icon="i-lucide-user-round-pen" title="Profile" /></template>
        <form class="space-y-4" @submit.prevent="save">
            <div class="flex items-center gap-4">
                <UAvatar :src="state.image || undefined" :alt="state.name" size="3xl" />
                <UFormField label="Avatar URL" class="flex-1">
                    <UInput v-model="state.image" type="url" placeholder="https://…" class="w-full" />
                </UFormField>
            </div>
            <UFormField label="Name" required>
                <UInput v-model="state.name" autocomplete="name" required class="w-full" />
            </UFormField>
            <div class="flex justify-end">
                <UButton type="submit" label="Save" :loading="saving" />
            </div>
        </form>
    </UPageCard>
</template>
