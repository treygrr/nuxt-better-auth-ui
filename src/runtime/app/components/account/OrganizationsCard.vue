<script setup lang="ts">
import { useAuthClient, useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, reactive, ref, useAuthCapabilities, useAuthI18n, useFetch, useToast, watch } from '#imports';
import { upperFirst } from 'scule';

import CardTitle from './CardTitle.vue';
import OrganizationModal from './OrganizationModal.vue';

/**
 * Their organizations (Better Auth's Organization plugin): create one, switch the active one, open one to manage it,
 * and answer invitations sent to their email.
 */
const { t, errorMessage } = useAuthI18n();
const toast = useToast();
const { capabilities } = useAuthCapabilities();
const { session, fetchSession } = useUserSession();

type Organization = { id: string; name: string; slug: string; logo?: string | null };
type Invitation = { id: string; organizationName: string; role: string; status: string };

// Better Auth's own GET endpoints, server-rendered.
const { data: organizations, refresh } = useFetch<Organization[]>('/api/auth/organization/list', {
    key: 'better-auth-ui-account-organizations',
    default: () => []
});
// Needs a verified email (Better Auth's rule for listing invitations by email): none otherwise.
const { data: invitations, refresh: refreshInvitations } = useFetch('/api/auth/organization/list-user-invitations', {
    key: 'better-auth-ui-account-invitations',
    transform: (list: Invitation[]) => list.filter((invitation) => invitation.status === 'pending'),
    default: () => [] as Invitation[]
});
const activeId = computed(
    () => (session.value as { activeOrganizationId?: string | null } | null)?.activeOrganizationId
);

type Result = Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
type OrganizationClient = {
    organization: {
        create(input: { name: string; slug: string }): Result;
        setActive(input: { organizationId: string | null }): Result;
        acceptInvitation(input: { invitationId: string }): Result;
        rejectInvitation(input: { invitationId: string }): Result;
    };
};
const client = () => (useAuthClient() as unknown as OrganizationClient).organization;
const fail = (error: { message?: string; code?: string } | null) =>
    toast.add({ title: t('account.organizations.failed'), description: errorMessage(error), color: 'error' });

async function switchTo(organization: Organization) {
    const { error } = await client().setActive({ organizationId: organization.id });
    if (error) return fail(error);
    await fetchSession({ force: true });
    toast.add({ title: t('account.organizations.switched', { name: organization.name }), color: 'success' });
}

// Creating one: a name, and the slug made from it (editable).
const creating = ref(false);
const form = reactive({ name: '', slug: '' });
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
function openCreate() {
    Object.assign(form, { name: '', slug: '' });
    slugEdited.value = false;
    creating.value = true;
}
const saving = ref(false);
async function create() {
    saving.value = true;
    const { error } = await client().create({ name: form.name.trim(), slug: form.slug });
    saving.value = false;
    if (error) return fail(error);
    creating.value = false;
    toast.add({ title: t('account.organizations.created', { name: form.name.trim() }), color: 'success' });
    await Promise.all([refresh(), fetchSession({ force: true })]);
}

async function answer(invitation: Invitation, accept: boolean) {
    const { error } = accept
        ? await client().acceptInvitation({ invitationId: invitation.id })
        : await client().rejectInvitation({ invitationId: invitation.id });
    if (error) return fail(error);
    toast.add({
        title: accept
            ? t('account.organizations.joinedName', { name: invitation.organizationName })
            : t('account.organizations.declined'),
        color: 'success'
    });
    await Promise.all([refresh(), refreshInvitations(), fetchSession({ force: true })]);
}

// Managing one.
const managing = ref<string | null>(null);
const manageOpen = computed({
    get: () => managing.value !== null,
    set: (value) => {
        if (!value) managing.value = null;
    }
});
async function changed() {
    await Promise.all([refresh(), fetchSession({ force: true })]);
}
</script>

<template>
    <div class="space-y-6">
        <UPageCard
            v-if="invitations.length"
            :title="t('account.organizations.invitationsTitle')"
            :description="t('account.organizations.invitationsDescription')"
            variant="subtle"
        >
            <template #title>
                <CardTitle icon="i-lucide-mail-plus" :title="t('account.organizations.invitationsTitle')" />
            </template>
            <ul class="divide-y divide-default">
                <li
                    v-for="invitation in invitations"
                    :key="invitation.id"
                    class="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-highlighted truncate">{{ invitation.organizationName }}</p>
                        <p class="text-xs text-muted">
                            {{ t('account.organizations.asRole', { role: upperFirst(invitation.role) }) }}
                        </p>
                    </div>
                    <UButton
                        :label="t('account.organizations.decline')"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        loading-auto
                        @click="answer(invitation, false)"
                    />
                    <UButton
                        :label="t('account.organizations.accept')"
                        size="sm"
                        loading-auto
                        @click="answer(invitation, true)"
                    />
                </li>
            </ul>
        </UPageCard>

        <UPageCard
            :title="t('account.organizations.title')"
            :description="t('account.organizations.description')"
            variant="subtle"
        >
            <template #title>
                <CardTitle icon="i-lucide-building-2" :title="t('account.organizations.title')" />
            </template>

            <p v-if="!organizations.length" class="text-sm text-muted">{{ t('account.organizations.none') }}</p>
            <ul v-else class="divide-y divide-default">
                <li
                    v-for="organization in organizations"
                    :key="organization.id"
                    class="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                    <UAvatar :src="organization.logo ?? undefined" :alt="organization.name" size="md" />
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-highlighted truncate">
                            {{ organization.name }}
                            <UBadge
                                v-if="organization.id === activeId"
                                :label="t('account.organizations.active')"
                                color="primary"
                                variant="subtle"
                                size="sm"
                                class="ms-1"
                            />
                        </p>
                        <p class="text-xs text-muted truncate">{{ organization.slug }}</p>
                    </div>
                    <UButton
                        v-if="organization.id !== activeId"
                        :label="t('account.organizations.switch')"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        loading-auto
                        @click="switchTo(organization)"
                    />
                    <UButton
                        :label="t('account.organizations.manage')"
                        color="neutral"
                        variant="outline"
                        size="sm"
                        @click="managing = organization.id"
                    />
                </li>
            </ul>

            <div v-if="capabilities?.organization?.allowCreate">
                <UButton :label="t('account.organizations.create')" icon="i-lucide-plus" @click="openCreate" />
            </div>
        </UPageCard>

        <UModal v-model:open="creating" :title="t('account.organizations.createTitle')">
            <template #body>
                <form id="create-organization" class="space-y-4" @submit.prevent="create">
                    <UFormField :label="t('account.organizations.name')" required>
                        <UInput v-model="form.name" autofocus required class="w-full" />
                    </UFormField>
                    <UFormField
                        :label="t('account.organizations.slug')"
                        :help="t('account.organizations.slugHelp')"
                        required
                    >
                        <UInput
                            v-model="form.slug"
                            required
                            pattern="[a-z0-9\-]+"
                            class="w-full"
                            @update:model-value="slugEdited = true"
                        />
                    </UFormField>
                </form>
            </template>
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton :label="t('common.cancel')" color="neutral" variant="subtle" @click="creating = false" />
                    <UButton
                        type="submit"
                        form="create-organization"
                        :label="t('account.organizations.create')"
                        :disabled="!form.name.trim() || !form.slug"
                        :loading="saving"
                    />
                </div>
            </template>
        </UModal>

        <OrganizationModal
            v-if="managing"
            v-model:open="manageOpen"
            :organization-id="managing"
            @changed="changed"
            @left="managing = null"
        />
    </div>
</template>
