<script setup lang="ts">
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, ref, useAuthCapabilities, useAuthI18n } from '#imports';

import type { OrganizationTeam } from '../../../server/api/organization/teams.get';
import { fieldValues } from '../../utils/fields';
import { useOrganizationActions } from '../../utils/organization';
import FieldInputs from './FieldInputs.vue';

/**
 * An organization's teams (Better Auth's teams): creating, renaming and removing them (`team:create`, `team:update`,
 * `team:delete`), their members (added from the organization's), and making one of yours the active team.
 */
const props = defineProps<{
    organizationId: string;
    teams: OrganizationTeam[];
    members: Array<{ userId: string; user: { name: string; email: string } }>;
    can: Record<string, boolean>;
}>();
const emit = defineEmits<{ changed: [] }>();

const { t } = useAuthI18n();
const { user, session, fetchSession } = useUserSession();
const { capabilities } = useAuthCapabilities();
const { run } = useOrganizationActions();
const fields = computed(() => capabilities.value?.organization?.fields.team ?? []);
const activeTeamId = computed(() => (session.value as { activeTeamId?: string | null } | null)?.activeTeamId);
const activeOrganizationId = computed(
    () => (session.value as { activeOrganizationId?: string | null } | null)?.activeOrganizationId
);

const name = ref('');
const extra = ref<Record<string, string | boolean>>({});
async function create() {
    const teamName = name.value.trim();
    const done = await run(
        (organization) =>
            organization.createTeam({
                name: teamName,
                organizationId: props.organizationId,
                ...fieldValues(fields.value, extra.value)
            }),
        t('organization.teams.created', { name: teamName })
    );
    if (!done) return;
    name.value = '';
    emit('changed');
}

const renaming = ref<string | null>(null);
const newName = ref('');
async function rename(team: OrganizationTeam) {
    const done = await run(
        (organization) => organization.updateTeam({ teamId: team.id, data: { name: newName.value.trim() } }),
        t('organization.teams.renamed')
    );
    if (!done) return;
    renaming.value = null;
    emit('changed');
}
async function remove(team: OrganizationTeam) {
    if (
        await run(
            (organization) => organization.removeTeam({ teamId: team.id, organizationId: props.organizationId }),
            t('organization.teams.removed', { name: team.name })
        )
    ) {
        emit('changed');
    }
}

/** The organization's members who aren't in the team yet. */
const addable = (team: OrganizationTeam) =>
    props.members
        .filter((member) => !team.members.some((item) => item.userId === member.userId))
        .map((member) => ({ label: `${member.user.name} (${member.user.email})`, value: member.userId }));
async function addMember(team: OrganizationTeam, userId: string) {
    if (
        await run(
            (organization) => organization.addTeamMember({ teamId: team.id, userId }),
            t('organization.teams.memberAdded')
        )
    ) {
        emit('changed');
    }
}
async function removeMember(team: OrganizationTeam, userId: string) {
    if (
        await run(
            (organization) => organization.removeTeamMember({ teamId: team.id, userId }),
            t('organization.teams.memberRemoved')
        )
    ) {
        emit('changed');
    }
}

/** Better Auth's active team belongs to the active organization: this one becomes active first. */
async function makeActive(team: OrganizationTeam) {
    if (activeOrganizationId.value !== props.organizationId) {
        const switched = await run((organization) => organization.setActive({ organizationId: props.organizationId }));
        if (!switched) return;
    }
    if (
        await run(
            (organization) => organization.setActiveTeam({ teamId: team.id }),
            t('organization.teams.activated', { name: team.name })
        )
    ) {
        await fetchSession({ force: true });
    }
}
</script>

<template>
    <div class="space-y-6">
        <UPageCard v-if="can['team:create']" :title="t('organization.teams.createTitle')" variant="subtle">
            <form class="space-y-4" @submit.prevent="create">
                <UFormField :label="t('organization.teams.name')" required>
                    <UInput v-model="name" required class="w-full" />
                </UFormField>
                <FieldInputs v-model="extra" :fields="fields" />
                <div class="flex justify-end">
                    <UButton
                        type="submit"
                        :label="t('organization.teams.create')"
                        icon="i-lucide-plus"
                        loading-auto
                        :disabled="!name.trim()"
                    />
                </div>
            </form>
        </UPageCard>

        <p v-if="!teams.length" class="text-sm text-muted">{{ t('organization.teams.none') }}</p>
        <UPageCard v-for="team in teams" :key="team.id" variant="subtle">
            <template #title>
                <form v-if="renaming === team.id" class="flex items-center gap-2" @submit.prevent="rename(team)">
                    <UInput v-model="newName" required autofocus size="sm" :aria-label="t('organization.teams.name')" />
                    <UButton type="submit" :label="t('common.save')" size="sm" loading-auto />
                    <UButton
                        :label="t('common.cancel')"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        @click="renaming = null"
                    />
                </form>
                <span v-else class="flex items-center gap-2">
                    {{ team.name }}
                    <UBadge
                        v-if="team.id === activeTeamId"
                        :label="t('organization.active')"
                        color="primary"
                        variant="subtle"
                        size="sm"
                    />
                </span>
            </template>
            <template #description>
                {{ t('organization.teams.memberCount', { count: team.members.length }) }}
            </template>

            <ul v-if="team.members.length" class="divide-y divide-default">
                <li
                    v-for="member in team.members"
                    :key="member.userId"
                    class="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                >
                    <UAvatar :src="member.image ?? undefined" :alt="member.name" size="sm" />
                    <div class="min-w-0 flex-1">
                        <p class="text-sm text-highlighted truncate">{{ member.name }}</p>
                        <p class="text-xs text-muted truncate">{{ member.email }}</p>
                    </div>
                    <UButton
                        v-if="can['team:update']"
                        icon="i-lucide-user-minus"
                        color="error"
                        variant="ghost"
                        size="sm"
                        :aria-label="t('organization.teams.removeMember', { name: member.name })"
                        loading-auto
                        @click="removeMember(team, member.userId)"
                    />
                </li>
            </ul>

            <div class="flex flex-wrap items-center gap-2">
                <USelectMenu
                    v-if="can['team:update'] && addable(team).length"
                    :items="addable(team)"
                    value-key="value"
                    :placeholder="t('organization.teams.addMember')"
                    class="w-64"
                    @update:model-value="(userId) => addMember(team, userId as string)"
                />
                <UButton
                    v-if="team.members.some((member) => member.userId === user?.id) && team.id !== activeTeamId"
                    :label="t('organization.teams.makeActive')"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    loading-auto
                    @click="makeActive(team)"
                />
                <UButton
                    v-if="can['team:update'] && renaming !== team.id"
                    :label="t('organization.teams.rename')"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    class="ms-auto"
                    @click="
                        renaming = team.id;
                        newName = team.name;
                    "
                />
                <UButton
                    v-if="can['team:delete']"
                    :label="t('organization.teams.remove')"
                    color="error"
                    variant="ghost"
                    size="sm"
                    loading-auto
                    @click="remove(team)"
                />
            </div>
        </UPageCard>
    </div>
</template>
