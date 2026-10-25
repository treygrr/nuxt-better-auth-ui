<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, reactive, ref, useAuthCapabilities, useAuthI18n, useFetch, useRuntimeConfig, watch } from '#imports';
import { upperFirst } from 'scule';

import { fieldValues } from '../../utils/fields';
import { useOrganizationActions } from '../../utils/organization';
import FieldInputs from '../organization/FieldInputs.vue';
import CardTitle from './CardTitle.vue';

/**
 * Their organizations (Better Auth's Organization plugin): create one, switch the active one, open one's page, their
 * teams in each, and answer invitations sent to their email.
 */
const { t } = useAuthI18n();
const { capabilities } = useAuthCapabilities();
const { session, fetchSession } = useUserSession();
const { organizationPage } = useRuntimeConfig().public.betterAuthUi as { organizationPage: string | false };
const { client, run } = useOrganizationActions();

type Organization = { id: string; name: string; slug: string; logo?: string | null };
type Invitation = { id: string; organizationName: string; role: string; status: string };
type Team = { id: string; name: string; organizationId: string };

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
// Their teams across their organizations (with teams on).
const { data: teams } = useFetch<Team[]>('/api/auth/organization/list-user-teams', {
    key: 'better-auth-ui-account-teams',
    default: () => [],
    immediate: !!capabilities.value?.organization?.teams
});
const teamsOf = (organizationId: string) => teams.value.filter((team) => team.organizationId === organizationId);
const activeId = computed(
    () => (session.value as { activeOrganizationId?: string | null } | null)?.activeOrganizationId
);

async function switchTo(organization: Organization) {
    if (
        await run(
            (client) => client.setActive({ organizationId: organization.id }),
            t('account.organizations.switched', { name: organization.name })
        )
    ) {
        await fetchSession({ force: true });
    }
}

// Creating one: a name, the slug made from it (editable, checked as they type), and the app's fields.
const fields = computed(() => capabilities.value?.organization?.fields.organization ?? []);
const creating = ref(false);
const form = reactive({ name: '', slug: '' });
const extra = ref<Record<string, string | boolean>>({});
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
const slug = refDebounced(
    computed(() => form.slug),
    400
);
const slugTaken = ref(false);
watch(slug, async (value) => {
    slugTaken.value = !!value && !!(await client().checkSlug({ slug: value })).error;
});
function openCreate() {
    Object.assign(form, { name: '', slug: '' });
    extra.value = {};
    slugEdited.value = false;
    creating.value = true;
}
const saving = ref(false);
async function create() {
    saving.value = true;
    const name = form.name.trim();
    const done = await run(
        (organization) => organization.create({ name, slug: form.slug, ...fieldValues(fields.value, extra.value) }),
        t('account.organizations.created', { name })
    );
    saving.value = false;
    if (!done) return;
    creating.value = false;
    await Promise.all([refresh(), fetchSession({ force: true })]);
}

async function answer(invitation: Invitation, accept: boolean) {
    const done = await run(
        (organization) =>
            accept
                ? organization.acceptInvitation({ invitationId: invitation.id })
                : organization.rejectInvitation({ invitationId: invitation.id }),
        accept
            ? t('account.organizations.joinedName', { name: invitation.organizationName })
            : t('account.organizations.declined')
    );
    if (done) await Promise.all([refresh(), refreshInvitations(), fetchSession({ force: true })]);
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
                        <p class="text-xs text-muted truncate">
                            {{ organization.slug }}
                            <template v-if="teamsOf(organization.id).length">
                                ·
                                {{
                                    t('account.organizations.yourTeams', {
                                        teams: teamsOf(organization.id)
                                            .map((team) => team.name)
                                            .join(', ')
                                    })
                                }}
                            </template>
                        </p>
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
                        v-if="organizationPage"
                        :to="`${organizationPage}/${organization.id}`"
                        :label="t('account.organizations.manage')"
                        color="neutral"
                        variant="outline"
                        size="sm"
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
                        :error="slugTaken ? t('organization.slugTaken') : undefined"
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
                    <FieldInputs v-model="extra" :fields="fields" />
                </form>
            </template>
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton :label="t('common.cancel')" color="neutral" variant="subtle" @click="creating = false" />
                    <UButton
                        type="submit"
                        form="create-organization"
                        :label="t('account.organizations.create')"
                        :disabled="!form.name.trim() || !form.slug || slugTaken"
                        :loading="saving"
                    />
                </div>
            </template>
        </UModal>
    </div>
</template>
