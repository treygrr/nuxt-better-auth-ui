<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import * as z from 'zod';
import {
    onMounted,
    reactive,
    ref,
    useBetterAuthAdminPath,
    useBetterAuthAdminUsers,
    useAuthI18n,
    useBetterAuthAdminConfig,
    useRoute,
    useRouter,
    useToast
} from '#imports';

const emit = defineEmits<{ created: [] }>();
const adminPath = useBetterAuthAdminPath();
const route = useRoute();
const router = useRouter();
const { t } = useAuthI18n();

const { roles } = useBetterAuthAdminConfig();

const schema = z.object({
    // Messages as functions, so they follow the language.
    name: z.string().min(1, { error: () => t('admin.validation.required') }),
    email: z.email({ error: () => t('admin.validation.invalidEmail') }),
    // Optional: without one the user signs in another way, or uses "Forgot password".
    password: z.union([z.literal(''), z.string().min(8, { error: () => t('admin.validation.passwordLength') })]),
    role: z.string()
});
type Schema = z.output<typeof schema>;

const open = ref(false);
const state = reactive<Schema>({ name: '', email: '', password: '', role: 'user' });

const users = useBetterAuthAdminUsers();
const toast = useToast();

// Opened by a link, eg the home page's "New user": ?create=1. In the browser, once the page is up.
onMounted(() => {
    if (route.query.create === undefined) return;
    open.value = true;
    router.replace({ query: { ...route.query, create: undefined } });
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
    try {
        const { password, ...rest } = event.data;
        const created = await users.create({ ...rest, ...(password && { password }) });
        toast.add({
            title: t('admin.modals.create.created'),
            description: event.data.email,
            color: 'success',
            actions: [
                {
                    label: t('admin.modals.create.open'),
                    color: 'neutral',
                    variant: 'outline',
                    to: adminPath(`/users/${created.id}`)
                }
            ]
        });
        Object.assign(state, { name: '', email: '', password: '', role: 'user' });
        open.value = false;
        emit('created');
    } catch (error) {
        toast.add({ title: t('admin.modals.create.failed'), description: (error as Error).message, color: 'error' });
    }
}
</script>

<template>
    <UModal
        v-model:open="open"
        :title="t('admin.modals.create.title')"
        :description="t('admin.modals.create.description')"
    >
        <UButton :label="t('admin.modals.create.title')" icon="i-lucide-plus" />

        <template #body>
            <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
                <UFormField :label="t('admin.common.name')" name="name">
                    <UInput v-model="state.name" class="w-full" />
                </UFormField>
                <UFormField :label="t('admin.common.email')" name="email">
                    <UInput v-model="state.email" type="email" class="w-full" />
                </UFormField>
                <UFormField
                    :label="t('admin.common.password')"
                    name="password"
                    :help="t('admin.modals.create.passwordHelp')"
                >
                    <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
                </UFormField>
                <UFormField :label="t('admin.common.role')" name="role">
                    <USelect v-model="state.role" :items="roles" class="w-full" />
                </UFormField>
                <div class="flex justify-end gap-2">
                    <UButton :label="t('admin.common.cancel')" color="neutral" variant="subtle" @click="open = false" />
                    <UButton :label="t('admin.modals.create.create')" type="submit" loading-auto />
                </div>
            </UForm>
        </template>
    </UModal>
</template>
