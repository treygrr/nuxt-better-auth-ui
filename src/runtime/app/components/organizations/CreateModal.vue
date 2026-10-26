<script setup lang="ts">
import { $fetch, navigateTo, reactive, ref, useBetterAuthAdminPath, useAuthI18n, useToast, watch } from '#imports';

import { ADMIN_API } from '../../../constants';
import { serverError } from '../../utils/server-error';

/**
 * Staff create an organization for a user, who becomes its owner: Better Auth's createOrganization, on the server.
 * Opens the new organization's admin page.
 */
const { t, errorMessage } = useAuthI18n();
const toast = useToast();
const adminPath = useBetterAuthAdminPath();

const open = ref(false);
const form = reactive({ name: '', slug: '', ownerEmail: '' });
// The slug follows the name until it's edited.
const slugEdited = ref(false);
const slugify = (text: string) =>
    text
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
watch(
    () => form.name,
    (name) => {
        if (!slugEdited.value) form.slug = slugify(name);
    }
);

const saving = ref(false);
async function create() {
    saving.value = true;
    try {
        const organization = await $fetch<{ id: string; name: string }>(`${ADMIN_API}/organizations`, {
            method: 'POST',
            body: form
        });
        toast.add({ title: t('admin.organizations.createdOne', { name: organization.name }), color: 'success' });
        open.value = false;
        await navigateTo(adminPath(`/organizations/${organization.id}`));
    } catch (failure) {
        toast.add({
            title: t('admin.organizations.createFailed'),
            description: errorMessage(serverError(failure)),
            color: 'error'
        });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <UModal
        v-model:open="open"
        :title="t('admin.organizations.createTitle')"
        :description="t('admin.organizations.createDescription')"
    >
        <UButton :label="t('admin.organizations.create')" icon="i-lucide-plus" />

        <template #body>
            <form id="better-auth-ui-organization-create" class="space-y-4" @submit.prevent="create">
                <UFormField :label="t('admin.organizations.columns.name')" required>
                    <UInput v-model="form.name" required class="w-full" />
                </UFormField>
                <UFormField :label="t('admin.organizations.slug')" :help="t('organization.slugHelp')" required>
                    <UInput
                        v-model="form.slug"
                        required
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        class="w-full"
                        @input="slugEdited = true"
                    />
                </UFormField>
                <UFormField :label="t('admin.organizations.owner')" :help="t('admin.organizations.ownerHelp')" required>
                    <UInput v-model="form.ownerEmail" type="email" required class="w-full" />
                </UFormField>
            </form>
        </template>

        <template #footer>
            <div class="flex justify-end gap-2 w-full">
                <UButton :label="t('common.cancel')" color="neutral" variant="subtle" @click="open = false" />
                <UButton
                    type="submit"
                    form="better-auth-ui-organization-create"
                    :label="t('admin.organizations.create')"
                    :loading="saving"
                />
            </div>
        </template>
    </UModal>
</template>
