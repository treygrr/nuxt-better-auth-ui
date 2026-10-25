<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import * as z from 'zod';
import { reactive, useAdminCan, useAdminUsers, useAuthI18n, useToast, watch } from '#imports';

import type { AdminUser } from '../../types';

const props = defineProps<{ user: AdminUser }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ updated: [] }>();

const { t } = useAuthI18n();
// Messages as functions, so they follow the language.
const schema = z.object({
    name: z.string().min(1, { error: () => t('admin.validation.required') }),
    email: z.email({ error: () => t('admin.validation.invalidEmail') }),
    image: z.union([z.literal(''), z.url({ error: () => t('admin.validation.url') })]),
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
// Better Auth requires set-email for the email and its verification.
const canSetEmail = useAdminCan()({ user: ['set-email'] });
const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
    try {
        // Only what changed: Better Auth checks a permission per field.
        const next = { ...event.data, image: event.data.image || null };
        const current = {
            name: props.user.name,
            email: props.user.email,
            image: props.user.image ?? null,
            emailVerified: props.user.emailVerified
        };
        const changed = Object.fromEntries(
            Object.entries(next).filter(([key, value]) => value !== current[key as keyof typeof current])
        );
        if (Object.keys(changed).length) await users.update(props.user.id, changed);
        toast.add({ title: t('admin.modals.edit.updated'), color: 'success' });
        open.value = false;
        emit('updated');
    } catch (error) {
        toast.add({ title: t('admin.modals.edit.failed'), description: (error as Error).message, color: 'error' });
    }
}
</script>

<template>
    <UModal v-model:open="open" :title="t('admin.modals.edit.title')" :description="user.email">
        <template #body>
            <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
                <UFormField :label="t('admin.common.name')" name="name">
                    <UInput v-model="state.name" class="w-full" />
                </UFormField>
                <UFormField :label="t('admin.common.email')" name="email">
                    <UInput v-model="state.email" type="email" class="w-full" :disabled="!canSetEmail" />
                </UFormField>
                <UFormField
                    :label="t('admin.modals.edit.avatarUrl')"
                    name="image"
                    :help="t('admin.modals.edit.optional')"
                >
                    <UInput v-model="state.image" class="w-full" />
                </UFormField>
                <UFormField name="emailVerified">
                    <USwitch
                        v-model="state.emailVerified"
                        :label="t('admin.modals.edit.emailVerified')"
                        :disabled="!canSetEmail"
                    />
                </UFormField>
                <div class="flex justify-end gap-2">
                    <UButton :label="t('admin.common.cancel')" color="neutral" variant="subtle" @click="open = false" />
                    <UButton :label="t('admin.common.save')" type="submit" loading-auto />
                </div>
            </UForm>
        </template>
    </UModal>
</template>
