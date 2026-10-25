<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import {
    computed,
    useAuthCapabilities,
    useAuthI18n,
    useAuthPages,
    useFetch,
    useRoute,
    useRouter,
    useSeoMeta
} from '#imports';
import { upperFirst } from 'scule';

import { UI_API } from '../../../constants';
import type { OrganizationTeam } from '../../../server/api/organization/teams.get';
import GeneralTab from '../../components/organization/GeneralTab.vue';
import InvitationsTab from '../../components/organization/InvitationsTab.vue';
import MembersTab from '../../components/organization/MembersTab.vue';
import RolesTab from '../../components/organization/RolesTab.vue';
import SsoTab from '../../components/organization/SsoTab.vue';
import TeamsTab from '../../components/organization/TeamsTab.vue';
import { splitRoles, useOrganizationActions } from '../../utils/organization';
import { serverError } from '../../utils/server-error';
import type { SsoProvider } from '../../utils/sso';

/**
 * An organization's own page (Better Auth's Organization plugin), for its members: its details, members, invitations,
 * teams and roles, each part shown to those whose role allows it, from Better Auth's own permission check.
 */
const { t, errorMessage } = useAuthI18n();
const route = useRoute();
const router = useRouter();
const pages = useAuthPages();
const { capabilities, loaded } = useAuthCapabilities();
const { user, session, fetchSession } = useUserSession();
const supported = await loaded;
const { run } = useOrganizationActions();
const id = route.params.id as string;

type Member = {
    id: string;
    userId: string;
    role: string;
    user: { name: string; email: string; image?: string | null };
};
type FullOrganization = {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    members: Member[];
    invitations: Array<{
        id: string;
        email: string;
        role: string;
        status: string;
        expiresAt: string;
        teamId?: string | null;
    }>;
} & Record<string, unknown>;

// Better Auth's own GET endpoints and the module's, server-rendered.
const {
    data: organization,
    error,
    refresh: refreshOrganization
} = await useFetch<FullOrganization>('/api/auth/organization/get-full-organization', {
    key: `better-auth-ui-organization-${id}`,
    query: { organizationId: id }
});
const { data: can, refresh: refreshCan } = await useFetch<Record<string, boolean>>(
    `${UI_API}/organizations/${encodeURIComponent(id)}/permissions`,
    { key: `better-auth-ui-organization-permissions-${id}`, default: () => ({}) }
);
const { data: teams, refresh: refreshTeams } = await useFetch<OrganizationTeam[]>(
    `${UI_API}/organizations/${encodeURIComponent(id)}/teams`,
    { key: `better-auth-ui-organization-teams-${id}`, default: () => [] }
);
// The organization's own roles (dynamic access control), for the role pickers and the roles tab: none without it, or
// without the `ac:read` permission.
const { data: dynamicRoles, refresh: refreshRoles } = await useFetch<
    Array<{ id: string; role: string; permission: unknown }>
>('/api/auth/organization/list-roles', {
    key: `better-auth-ui-organization-roles-${id}`,
    query: { organizationId: id },
    default: () => [],
    immediate: !!supported?.organization?.dynamicRoles
});
useSeoMeta({ title: () => organization.value?.name ?? t('organization.title') });

const me = computed(() => organization.value?.members.find((member) => member.userId === user.value?.id));
// Single sign-on (SSO plugin): Better Auth lets an organization's owners and admins (those roles by name) manage its
// providers, and lists the providers of every organization they run.
const ssoManager = computed(() => splitRoles(me.value?.role).some((role) => role === 'owner' || role === 'admin'));
const { data: ssoProviders, refresh: refreshSso } = await useFetch<{ providers: SsoProvider[] }>(
    '/api/auth/sso/providers',
    {
        key: `better-auth-ui-organization-sso-${id}`,
        default: () => ({ providers: [] }),
        immediate: !!supported?.sso
    }
);
const organizationSso = computed(() =>
    (ssoProviders.value?.providers ?? []).filter((provider) => provider.organizationId === id)
);
const roleNames = computed(() => [
    ...new Set([
        ...(capabilities.value?.organization?.roles ?? []),
        ...(dynamicRoles.value ?? []).map((role) => role.role)
    ])
]);
const isActive = computed(
    () => (session.value as { activeOrganizationId?: string | null } | null)?.activeOrganizationId === id
);

const tabs = computed<TabsItem[]>(() => [
    { label: t('organization.tabs.general'), icon: 'i-lucide-building-2', value: 'general', slot: 'general' },
    { label: t('organization.tabs.members'), icon: 'i-lucide-users', value: 'members', slot: 'members' },
    {
        label: t('organization.tabs.invitations'),
        icon: 'i-lucide-mail-plus',
        value: 'invitations',
        slot: 'invitations'
    },
    ...(capabilities.value?.organization?.teams
        ? [{ label: t('organization.tabs.teams'), icon: 'i-lucide-users-round', value: 'teams', slot: 'teams' }]
        : []),
    { label: t('organization.tabs.roles'), icon: 'i-lucide-shield', value: 'roles', slot: 'roles' },
    ...(capabilities.value?.sso && ssoManager.value
        ? [{ label: t('organization.tabs.sso'), icon: 'i-lucide-key-square', value: 'sso', slot: 'sso' }]
        : [])
]);
// The open tab lives in the URL (?tab=members), so it's server-rendered, survives reloads and can be linked to.
const tab = computed({
    get() {
        const requested = route.query.tab;
        return typeof requested === 'string' && tabs.value.some((item) => item.value === requested)
            ? requested
            : 'general';
    },
    set(value: string) {
        router.replace({ query: { ...route.query, tab: value } });
    }
});

const changed = () =>
    Promise.all([
        refreshOrganization(),
        refreshCan(),
        refreshTeams(),
        refreshRoles(),
        ...(supported?.sso ? [refreshSso()] : [])
    ]);
async function makeActive() {
    if (await run((client) => client.setActive({ organizationId: id }), t('organization.switched'))) {
        await fetchSession({ force: true });
    }
}
const backTo = computed(() => (pages.account ? `${pages.account}?tab=organizations` : '/'));
</script>

<template>
    <UContainer class="py-12">
        <div class="w-full max-w-3xl mx-auto space-y-6">
            <UButton
                :to="backTo"
                :label="t('organization.back')"
                icon="i-lucide-arrow-left"
                color="neutral"
                variant="link"
                class="px-0"
            />

            <UAlert
                v-if="error"
                color="error"
                icon="i-lucide-circle-alert"
                :title="t('organization.unavailable')"
                :description="errorMessage(serverError(error))"
            />

            <template v-else-if="organization">
                <section class="flex flex-wrap items-center gap-4">
                    <UAvatar :src="organization.logo ?? undefined" :alt="organization.name" size="3xl" />
                    <div class="min-w-0 flex-1">
                        <h1 class="text-xl font-semibold text-highlighted truncate">{{ organization.name }}</h1>
                        <p class="text-sm text-muted">
                            {{ organization.slug }}
                            <template v-if="me">
                                · {{ t('organization.yourRole') }}
                                {{ splitRoles(me.role).map(upperFirst).join(', ') }}
                            </template>
                        </p>
                    </div>
                    <UBadge v-if="isActive" :label="t('organization.active')" color="primary" variant="subtle" />
                    <UButton
                        v-else
                        :label="t('organization.makeActive')"
                        color="neutral"
                        variant="outline"
                        loading-auto
                        @click="makeActive"
                    />
                </section>

                <UTabs
                    v-model="tab"
                    :items="tabs"
                    variant="link"
                    :ui="{
                        list: 'mb-2 overflow-x-auto overflow-y-hidden',
                        trigger: 'grow shrink-0 px-2.5 sm:px-3',
                        label: 'overflow-visible max-sm:group-data-[state=inactive]:sr-only'
                    }"
                    class="w-full"
                >
                    <template #general>
                        <GeneralTab :organization="organization" :can="can" @changed="changed" />
                    </template>
                    <template #members>
                        <MembersTab :organization-id="id" :can="can" :role-names="roleNames" @changed="changed" />
                    </template>
                    <template #invitations>
                        <InvitationsTab
                            :organization-id="id"
                            :invitations="organization.invitations"
                            :teams="teams"
                            :can="can"
                            :role-names="roleNames"
                            @changed="changed"
                        />
                    </template>
                    <template #teams>
                        <TeamsTab
                            :organization-id="id"
                            :teams="teams"
                            :members="organization.members"
                            :can="can"
                            @changed="changed"
                        />
                    </template>
                    <template #roles>
                        <RolesTab
                            :organization-id="id"
                            :can="can"
                            :dynamic-roles="dynamicRoles ?? []"
                            @changed="changed"
                        />
                    </template>
                    <template #sso>
                        <SsoTab :organization-id="id" :providers="organizationSso" @changed="changed" />
                    </template>
                </UTabs>
            </template>
        </div>
    </UContainer>
</template>
