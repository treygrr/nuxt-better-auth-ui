<script setup lang="ts">
import { useUserSession } from '@nuxtjs/better-auth/composables';
import {
    $fetch,
    computed,
    navigateTo,
    reactive,
    ref,
    useAdminCan,
    useAdminPath,
    useAdminUsers,
    useAuthCapabilities,
    useAuthI18n,
    useBetterAuthAdminConfig,
    useFetch,
    useRoute,
    useRuntimeConfig,
    useToast
} from '#imports';
import { upperFirst } from 'scule';

import { ADMIN_API } from '../../../constants';
import type { AdminOrganizationDetail } from '../../../server/api/organizations/[id].get';
import { serverError } from '../../utils/server-error';

/**
 * One organization, for staff: its members (linking to their user pages), pending invitations, teams and its own
 * roles. Staff who can update users add members and create and remove teams, through the calls Better Auth allows
 * without a member's session (addMember, createTeam, removeTeam). For the rest, Better Auth needs a member: with
 * impersonation on, staff make those changes as the owner, on the organization's own page.
 */
const adminPath = useAdminPath();
const { t, errorMessage } = useAuthI18n();
const toast = useToast();
const { capabilities } = useAuthCapabilities();
const can = useAdminCan();
const canAdd = can({ user: ['update'] });
const id = useRoute().params.id as string;

const {
    data: organization,
    error,
    refresh
} = await useFetch<AdminOrganizationDetail>(`${ADMIN_API}/organizations/${encodeURIComponent(id)}`);

// Adding a member: their email, roles (the app's and the organization's own) and, with teams, a team.
const roleItems = computed(() =>
    [
        ...new Set([
            ...(capabilities.value?.organization?.roles ?? []),
            ...(organization.value?.roles ?? []).map((role) => role.role)
        ])
    ].map((role) => ({ label: upperFirst(role), value: role }))
);
const teamItems = computed(() =>
    (organization.value?.teams ?? []).map((team) => ({ label: team.name, value: team.id }))
);
const form = reactive<{ email: string; roles: string[]; teamId: string | undefined }>({
    email: '',
    roles: ['member'],
    teamId: undefined
});
const adding = ref(false);
async function addMember() {
    adding.value = true;
    try {
        await $fetch(`${ADMIN_API}/organizations/${encodeURIComponent(id)}/members`, {
            method: 'POST',
            body: { email: form.email, roles: form.roles, teamId: form.teamId }
        });
        toast.add({ title: t('admin.organizations.added', { email: form.email }), color: 'success' });
        form.email = '';
        await refresh();
    } catch (failure) {
        toast.add({
            title: t('admin.organizations.addFailed'),
            description: errorMessage(serverError(failure)),
            color: 'error'
        });
    } finally {
        adding.value = false;
    }
}

// Teams: created and removed through Better Auth's server-side createTeam and removeTeam.
const teamName = ref('');
const creatingTeam = ref(false);
async function createTeam() {
    creatingTeam.value = true;
    try {
        await $fetch(`${ADMIN_API}/organizations/${encodeURIComponent(id)}/teams`, {
            method: 'POST',
            body: { name: teamName.value }
        });
        toast.add({ title: t('admin.organizations.teamCreated', { name: teamName.value }), color: 'success' });
        teamName.value = '';
        await refresh();
    } catch (failure) {
        toast.add({
            title: t('admin.organizations.teamFailed'),
            description: errorMessage(serverError(failure)),
            color: 'error'
        });
    } finally {
        creatingTeam.value = false;
    }
}
async function removeTeam(team: { id: string; name: string }) {
    try {
        await $fetch(`${ADMIN_API}/organizations/${encodeURIComponent(id)}/teams/${encodeURIComponent(team.id)}`, {
            method: 'DELETE'
        });
        toast.add({ title: t('admin.organizations.teamRemoved', { name: team.name }), color: 'success' });
        await refresh();
    } catch (failure) {
        toast.add({
            title: t('admin.organizations.teamFailed'),
            description: errorMessage(serverError(failure)),
            color: 'error'
        });
    }
}

// Everything else needs a member's session: staff who can impersonate sign in as the owner (Better Auth's
// impersonation, audit-logged) and land on the organization's own page.
const { impersonation } = useBetterAuthAdminConfig();
const { organizationPage } = useRuntimeConfig().public.betterAuthUi as { organizationPage: string | false };
const session = useUserSession();
const users = useAdminUsers();
const owner = computed(() =>
    organization.value?.members.find((member) => member.role.split(',').some((role) => role.trim() === 'owner'))
);
const canActAsOwner = computed(
    () =>
        impersonation &&
        !!organizationPage &&
        can({ user: ['impersonate'] }) &&
        !!owner.value?.user &&
        owner.value.user.id !== session.user.value?.id
);
async function actAsOwner() {
    try {
        await users.impersonate(owner.value!.user!.id);
        // A full load, so the whole app picks up the owner's session.
        await navigateTo(`${organizationPage}/${encodeURIComponent(id)}`, { external: true });
    } catch (failure) {
        toast.add({
            title: t('admin.impersonation.failed'),
            description: (failure as Error).message,
            color: 'error'
        });
    }
}

const permissionList = (permissions: Record<string, string[]>) =>
    Object.entries(permissions).flatMap(([resource, actions]) => actions.map((action) => `${resource}:${action}`));
/** "owner,admin" → "Owner, Admin": Better Auth stores several roles comma-separated. */
const roles = (role: string) =>
    role
        .split(',')
        .map((item) => upperFirst(item.trim()))
        .join(', ');
</script>

<template>
    <UDashboardPanel id="organization">
        <template #header>
            <UDashboardNavbar :title="organization?.name ?? t('admin.organizations.title')">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <UAlert
                v-if="error"
                color="error"
                icon="i-lucide-circle-alert"
                :title="t('admin.organizations.loadFailed')"
                :description="errorMessage(serverError(error))"
            >
                <template #actions>
                    <UButton
                        :to="adminPath('/organizations')"
                        :label="t('admin.organizations.back')"
                        color="neutral"
                        variant="outline"
                    />
                </template>
            </UAlert>

            <div v-else-if="organization" class="flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full lg:max-w-3xl mx-auto">
                <UPageCard variant="subtle">
                    <div class="flex items-center gap-4">
                        <UAvatar :src="organization.logo ?? undefined" :alt="organization.name" size="3xl" />
                        <div class="min-w-0">
                            <p class="text-lg font-semibold text-highlighted truncate">{{ organization.name }}</p>
                            <p class="text-muted truncate">{{ organization.slug }}</p>
                            <p class="text-sm text-muted mt-1">
                                {{ t('admin.organizations.created') }}
                                <NuxtTime :datetime="organization.createdAt" date-style="medium" />
                            </p>
                        </div>
                    </div>
                </UPageCard>

                <UPageCard
                    :title="t('admin.organizations.members', { count: organization.members.length })"
                    :description="t('admin.organizations.readOnly')"
                    variant="subtle"
                >
                    <ul class="divide-y divide-default">
                        <li
                            v-for="member in organization.members"
                            :key="member.id"
                            class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                        >
                            <UAvatar :src="member.user?.image ?? undefined" :alt="member.user?.name" size="md" />
                            <div class="min-w-0 flex-1">
                                <ULink
                                    v-if="member.user"
                                    :to="adminPath(`/users/${member.user.id}`)"
                                    class="text-sm font-medium text-highlighted hover:underline"
                                >
                                    {{ member.user.name }}
                                </ULink>
                                <p class="text-xs text-muted truncate">{{ member.user?.email }}</p>
                            </div>
                            <UBadge :label="roles(member.role)" color="neutral" variant="subtle" />
                        </li>
                    </ul>
                    <template v-if="canAdd" #footer>
                        <form class="flex flex-wrap items-start gap-2 w-full" @submit.prevent="addMember">
                            <UInput
                                v-model="form.email"
                                type="email"
                                required
                                :placeholder="t('admin.organizations.addEmail')"
                                :aria-label="t('admin.organizations.addEmail')"
                                class="flex-1 min-w-48"
                            />
                            <USelectMenu
                                v-model="form.roles"
                                :items="roleItems"
                                value-key="value"
                                multiple
                                class="w-40"
                                :aria-label="t('admin.organizations.addRoles')"
                            />
                            <USelect
                                v-if="teamItems.length"
                                v-model="form.teamId"
                                :items="teamItems"
                                :placeholder="t('admin.organizations.noTeam')"
                                class="w-36"
                            />
                            <UButton
                                type="submit"
                                :label="t('admin.organizations.add')"
                                icon="i-lucide-user-plus"
                                :loading="adding"
                                :disabled="!form.email || !form.roles.length"
                            />
                        </form>
                    </template>
                </UPageCard>

                <UPageCard
                    v-if="capabilities?.organization?.teams || organization.teams.length"
                    :title="t('admin.organizations.teams')"
                    variant="subtle"
                >
                    <p v-if="!organization.teams.length" class="text-sm text-muted">
                        {{ t('admin.organizations.noTeams') }}
                    </p>
                    <ul v-else class="divide-y divide-default">
                        <li
                            v-for="team in organization.teams"
                            :key="team.id"
                            class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                            <UIcon name="i-lucide-users-round" class="size-5 shrink-0 text-muted" />
                            <p class="text-sm font-medium text-highlighted flex-1">{{ team.name }}</p>
                            <span class="text-xs text-muted">
                                {{ t('admin.organizations.teamMembers', { count: team.members }) }}
                            </span>
                            <UButton
                                v-if="canAdd"
                                icon="i-lucide-trash"
                                color="error"
                                variant="ghost"
                                size="sm"
                                :aria-label="t('admin.organizations.removeTeam', { name: team.name })"
                                loading-auto
                                @click="removeTeam(team)"
                            />
                        </li>
                    </ul>
                    <template v-if="canAdd && capabilities?.organization?.teams" #footer>
                        <form class="flex flex-wrap items-start gap-2 w-full" @submit.prevent="createTeam">
                            <UInput
                                v-model="teamName"
                                required
                                :placeholder="t('admin.organizations.teamName')"
                                :aria-label="t('admin.organizations.teamName')"
                                class="flex-1 min-w-48"
                            />
                            <UButton
                                type="submit"
                                :label="t('admin.organizations.createTeam')"
                                icon="i-lucide-plus"
                                :loading="creatingTeam"
                                :disabled="!teamName.trim()"
                            />
                        </form>
                    </template>
                </UPageCard>

                <UPageCard v-if="organization.roles.length" :title="t('admin.organizations.roles')" variant="subtle">
                    <ul class="divide-y divide-default">
                        <li
                            v-for="role in organization.roles"
                            :key="role.id"
                            class="py-2.5 first:pt-0 last:pb-0 space-y-1.5"
                        >
                            <p class="text-sm font-medium text-highlighted">{{ upperFirst(role.role) }}</p>
                            <div class="flex flex-wrap gap-1">
                                <UBadge
                                    v-for="permission in permissionList(role.permission)"
                                    :key="permission"
                                    :label="permission"
                                    color="neutral"
                                    variant="subtle"
                                    size="sm"
                                />
                            </div>
                        </li>
                    </ul>
                </UPageCard>

                <UPageCard :title="t('admin.organizations.invitations')" variant="subtle">
                    <p v-if="!organization.invitations.length" class="text-sm text-muted">
                        {{ t('admin.organizations.noInvitations') }}
                    </p>
                    <ul v-else class="divide-y divide-default">
                        <li
                            v-for="invitation in organization.invitations"
                            :key="invitation.id"
                            class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                        >
                            <UIcon name="i-lucide-mail" class="size-5 shrink-0 text-muted" />
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-medium text-highlighted truncate">{{ invitation.email }}</p>
                                <p class="text-xs text-muted">
                                    {{ t('admin.organizations.invitedBy', { name: invitation.inviter?.name ?? '—' }) }}
                                    · {{ t('admin.organizations.expires') }}
                                    <NuxtTime :datetime="invitation.expiresAt" date-style="medium" />
                                </p>
                            </div>
                            <UBadge :label="roles(invitation.role)" color="neutral" variant="subtle" />
                        </li>
                    </ul>
                </UPageCard>

                <UPageCard
                    v-if="canActAsOwner"
                    :title="t('admin.organizations.asOwnerTitle')"
                    :description="t('admin.organizations.asOwnerDescription', { name: owner!.user!.name })"
                    variant="subtle"
                >
                    <div>
                        <UButton
                            :label="t('admin.organizations.asOwner', { name: owner!.user!.name })"
                            icon="i-lucide-venetian-mask"
                            color="neutral"
                            variant="outline"
                            loading-auto
                            @click="actAsOwner"
                        />
                    </div>
                </UPageCard>
            </div>
        </template>
    </UDashboardPanel>
</template>
