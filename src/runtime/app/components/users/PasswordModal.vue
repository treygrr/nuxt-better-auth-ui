<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import * as z from 'zod';
import { reactive, useAdminUsers, useToast, watch } from '#imports';

import type { AdminUser } from '../../types';

const props = defineProps<{ user: AdminUser }>();
const open = defineModel<boolean>('open', { default: false });

const schema = z.object({ password: z.string().min(8, 'At least 8 characters') });
type Schema = z.output<typeof schema>;
const state = reactive<Schema>({ password: '' });
watch(open, (isOpen) => {
    if (isOpen) state.password = '';
});

const users = useAdminUsers();
const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
    try {
        await users.setPassword(props.user.id, event.data.password);
        toast.add({
            title: 'Password set',
            description: `Tell ${props.user.name} their new password.`,
            color: 'success'
        });
        open.value = false;
    } catch (error) {
        toast.add({ title: "Couldn't set the password", description: (error as Error).message, color: 'error' });
    }
}

async function sendReset() {
    try {
        await users.sendPasswordReset(props.user.email);
        toast.add({ title: 'Reset link sent', description: props.user.email, color: 'success' });
        open.value = false;
    } catch (error) {
        toast.add({ title: "Couldn't send the reset link", description: (error as Error).message, color: 'error' });
    }
}
</script>

<template>
    <UModal v-model:open="open" title="Password" :description="user.email">
        <template #body>
            <div class="space-y-6">
                <div class="space-y-2">
                    <p class="text-sm text-muted">Email them a link to choose a new password themselves.</p>
                    <UButton
                        label="Send reset link"
                        icon="i-lucide-mail"
                        color="neutral"
                        variant="outline"
                        loading-auto
                        @click="sendReset"
                    />
                </div>

                <USeparator label="or" />

                <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
                    <UFormField label="Set a new password" name="password" help="At least 8 characters.">
                        <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
                    </UFormField>
                    <div class="flex justify-end gap-2">
                        <UButton label="Cancel" color="neutral" variant="subtle" @click="open = false" />
                        <UButton label="Set password" type="submit" loading-auto />
                    </div>
                </UForm>
            </div>
        </template>
    </UModal>
</template>
