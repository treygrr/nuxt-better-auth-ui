<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import * as z from 'zod';
import { reactive, useAdminUsers, useToast, watch } from '#imports';

import type { AdminUser } from '../../types';

const props = defineProps<{ user: AdminUser }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ updated: [] }>();

const schema = z.object({
    name: z.string().min(1, 'Required'),
    email: z.email('Invalid email'),
    image: z.union([z.literal(''), z.url('Must be a URL')]),
    emailVerified: z.boolean()
});
type Schema = z.output<typeof schema>;

const state = reactive<Schema>({ name: '', email: '', image: '', emailVerified: false });
watch(
    () => [open.value, props.user] as const,
    ([isOpen, user]) => {
        if (isOpen)
            Object.assign(state, {
                name: user.name,
                email: user.email,
                image: user.image ?? '',
                emailVerified: user.emailVerified
            });
    },
    { immediate: true }
);

const users = useAdminUsers();
const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
    try {
        await users.update(props.user.id, { ...event.data, image: event.data.image || null });
        toast.add({ title: 'User updated', color: 'success' });
        open.value = false;
        emit('updated');
    } catch (error) {
        toast.add({ title: "Couldn't update the user", description: (error as Error).message, color: 'error' });
    }
}
</script>

<template>
    <UModal v-model:open="open" title="Edit user" :description="user.email">
        <template #body>
            <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
                <UFormField label="Name" name="name">
                    <UInput v-model="state.name" class="w-full" />
                </UFormField>
                <UFormField label="Email" name="email">
                    <UInput v-model="state.email" type="email" class="w-full" />
                </UFormField>
                <UFormField label="Avatar URL" name="image" help="Optional.">
                    <UInput v-model="state.image" class="w-full" />
                </UFormField>
                <UFormField name="emailVerified">
                    <USwitch v-model="state.emailVerified" label="Email verified" />
                </UFormField>
                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="subtle" @click="open = false" />
                    <UButton label="Save" type="submit" loading-auto />
                </div>
            </UForm>
        </template>
    </UModal>
</template>
