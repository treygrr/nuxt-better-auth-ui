<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import * as z from 'zod';
import { reactive, useBetterAuthAdminCan, useBetterAuthAdminUsers, useAuthI18n, useToast, watch } from '#imports';

import type { AdminUser } from '../../types';

const props = defineProps<{ user: AdminUser }>();
const open = defineModel<boolean>('open', { default: false });

const { t } = useAuthI18n();
// The message as a function, so it follows the language.
const schema = z.object({ password: z.string().min(8, { error: () => t('admin.validation.passwordLength') }) });
type Schema = z.output<typeof schema>;
const state = reactive<Schema>({ password: '' });
watch(open, (isOpen) => {
    if (isOpen) state.password = '';
});

const users = useBetterAuthAdminUsers();
const canSetPassword = useBetterAuthAdminCan()({ user: ['set-password'] });
const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
    try {
        await users.setPassword(props.user.id, event.data.password);
        toast.add({
            title: t('admin.modals.password.set'),
            description: t('admin.modals.password.tellThem', { name: props.user.name }),
            color: 'success'
        });
        open.value = false;
    } catch (error) {
        toast.add({
            title: t('admin.modals.password.setFailed'),
            description: (error as Error).message,
            color: 'error'
        });
    }
}

async function sendReset() {
    try {
        await users.sendPasswordReset(props.user.email);
        toast.add({ title: t('admin.modals.password.resetSent'), description: props.user.email, color: 'success' });
        open.value = false;
    } catch (error) {
        toast.add({
            title: t('admin.modals.password.resetFailed'),
            description: (error as Error).message,
            color: 'error'
        });
    }
}
</script>

<template>
    <UModal v-model:open="open" :title="t('admin.common.password')" :description="user.email">
        <template #body>
            <div class="space-y-6">
                <div class="space-y-2">
                    <p class="text-sm text-muted">{{ t('admin.modals.password.emailLink') }}</p>
                    <UButton
                        :label="t('admin.modals.password.sendReset')"
                        icon="i-lucide-mail"
                        color="neutral"
                        variant="outline"
                        loading-auto
                        @click="sendReset"
                    />
                </div>

                <USeparator v-if="canSetPassword" :label="t('admin.modals.password.or')" />

                <UForm v-if="canSetPassword" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
                    <UFormField
                        :label="t('admin.modals.password.setNew')"
                        name="password"
                        :help="t('admin.modals.password.help')"
                    >
                        <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
                    </UFormField>
                    <div class="flex justify-end gap-2">
                        <UButton
                            :label="t('admin.common.cancel')"
                            color="neutral"
                            variant="subtle"
                            @click="open = false"
                        />
                        <UButton :label="t('admin.modals.password.setPassword')" type="submit" loading-auto />
                    </div>
                </UForm>
            </div>
        </template>
    </UModal>
</template>
