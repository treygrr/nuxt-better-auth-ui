<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, useAuthCapabilities, useAuthI18n, useAuthPages, useFetch, useRuntimeConfig } from '#imports';

import { useAuthActiveOrganization } from '../composables/useAuthActiveOrganization';
import { useOrganizationActions } from '../utils/organization';

/**
 * `<AuthOrganizationSwitcher>`: the active organization, for an app's header or sidebar. Opens to switch organization
 * (and, with teams on, the active team), to the organization's page, and to create one. Better Auth's Organization
 * plugin; signed-in users only (renders nothing otherwise).
 */
const props = withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg'; block?: boolean }>(), { size: 'md', block: false });

const { t } = useAuthI18n();
const pages = useAuthPages();
const { capabilities, loaded } = useAuthCapabilities();
const { loggedIn, fetchSession } = useUserSession();
const { organizationPage } = useRuntimeConfig().public.betterAuthUi as { organizationPage: string | false };
const { organization, activeTeamId, refresh } = useAuthActiveOrganization();
const { run } = useOrganizationActions();

type Organization = { id: string; name: string; logo?: string | null };
type Team = { id: string; name: string; organizationId: string };
// Only for the signed-in, with the Organization plugin (and teams): nothing is fetched otherwise, and signing in
// fetches them. Waits for the capabilities, which the server renders, so it knows during server rendering too.
await loaded;
const listsOrganizations = () => loggedIn.value && !!capabilities.value?.organization;
const listsTeams = () => listsOrganizations() && !!capabilities.value?.organization?.teams;
const { data: organizations } = useFetch<Organization[]>('/api/auth/organization/list', {
    key: 'better-auth-ui-account-organizations',
    default: () => [],
    enabled: listsOrganizations,
    watch: [listsOrganizations]
});
const { data: teams } = useFetch<Team[]>('/api/auth/organization/list-user-teams', {
    key: 'better-auth-ui-account-teams',
    default: () => [],
    enabled: listsTeams,
    watch: [listsTeams]
});

async function switchTo(organizationId: string) {
    if (await run((client) => client.setActive({ organizationId }))) {
        await fetchSession({ force: true });
        await refresh();
    }
}
async function switchTeam(teamId: string) {
    if (await run((client) => client.setActiveTeam({ teamId }))) await fetchSession({ force: true });
}

const items = computed<DropdownMenuItem[][]>(() => {
    const active = organization.value;
    const groups: DropdownMenuItem[][] = [
        [
            { type: 'label', label: t('organization.switcher.organizations') },
            ...organizations.value.map((item) => ({
                label: item.name,
                avatar: { src: item.logo ?? undefined, alt: item.name },
                icon: item.id === active?.id ? 'i-lucide-check' : undefined,
                onSelect: () => switchTo(item.id)
            }))
        ]
    ];
    const activeTeams = teams.value.filter((team) => team.organizationId === active?.id);
    if (activeTeams.length) {
        groups.push([
            { type: 'label', label: t('organization.switcher.teams') },
            ...activeTeams.map((team) => ({
                label: team.name,
                icon: team.id === activeTeamId.value ? 'i-lucide-check' : 'i-lucide-users-round',
                onSelect: () => switchTeam(team.id)
            }))
        ]);
    }
    groups.push([
        ...(active && organizationPage
            ? [
                  {
                      label: t('organization.switcher.manage'),
                      icon: 'i-lucide-settings',
                      to: `${organizationPage}/${active.id}`
                  }
              ]
            : []),
        ...(capabilities.value?.organization?.allowCreate && pages.account
            ? [
                  {
                      label: t('organization.switcher.create'),
                      icon: 'i-lucide-plus',
                      to: `${pages.account}?tab=organizations`
                  }
              ]
            : [])
    ]);
    return groups;
});
</script>

<template>
    <UDropdownMenu v-if="loggedIn && capabilities?.organization" :items="items" :content="{ align: 'start' }">
        <UButton
            :label="organization?.name ?? t('organization.switcher.choose')"
            :avatar="organization ? { src: organization.logo ?? undefined, alt: organization.name } : undefined"
            :icon="organization ? undefined : 'i-lucide-building-2'"
            trailing-icon="i-lucide-chevrons-up-down"
            color="neutral"
            variant="ghost"
            :size="props.size"
            :block="props.block"
        />
    </UDropdownMenu>
</template>
