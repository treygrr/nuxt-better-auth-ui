<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import * as z from 'zod';
import { computed, reactive, ref, useAdminUsers, useBetterAuthAdminConfig, useToast } from '#imports';

const emit = defineEmits<{ created: [] }>();

const { role: adminRole } = useBetterAuthAdminConfig();
const roles = computed(() => [...new Set(['user', adminRole])]);

const schema = z.object({
    name: z.string().min(1, 'Required'),
    email: z.email('Invalid email'),
    // Optional: without one the user signs in another way, or uses "Forgot password".
    password: z.union([z.literal(''), z.string().min(8, 'At least 8 characters')]),
    role: z.string()
});
type Schema = z.output<typeof schema>;

const open = ref(false);
const state = reactive<Schema>({ name: '', email: '', password: '', role: 'user' });

const users = useAdminUsers();
const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
    try {
        const { password, ...rest } = event.data;
        await users.create({ ...rest, ...(password && { password }) });
        toast.add({ title: 'User created', description: event.data.email, color: 'success' });
        Object.assign(state, { name: '', email: '', password: '', role: 'user' });
        open.value = false;
        emit('created');
    } catch (error) {
        toast.add({ title: "Couldn't create the user", description: (error as Error).message, color: 'error' });
    }
}
</script>

<template>
    <UModal v-model:open="open" title="Add user" description="Create an account. They can sign in straight away.">
        <UButton label="Add user" icon="i-lucide-plus" />

        <template #body>
            <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
                <UFormField label="Name" name="name">
                    <UInput v-model="state.name" class="w-full" />
                </UFormField>
                <UFormField label="Email" name="email">
                    <UInput v-model="state.email" type="email" class="w-full" />
                </UFormField>
                <UFormField label="Password" name="password" help="Optional. At least 8 characters.">
                    <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
                </UFormField>
                <UFormField label="Role" name="role">
                    <USelect v-model="state.role" :items="roles" class="w-full" />
                </UFormField>
                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="subtle" @click="open = false" />
                    <UButton label="Create" type="submit" loading-auto />
                </div>
            </UForm>
        </template>
    </UModal>
</template>
