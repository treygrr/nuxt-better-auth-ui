import type { ComputedRef } from 'vue';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, useFetch } from '#imports';

/** The active organization, as Better Auth's get-full-organization returns it: with its members and invitations. */
export type ActiveOrganization = {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    members: Array<{
        id: string;
        userId: string;
        role: string;
        user: { name: string; email: string; image?: string | null };
    }>;
    invitations: Array<{ id: string; email: string; role: string; status: string }>;
} & Record<string, unknown>;

/**
 * The signed-in user's active organization (Better Auth's Organization plugin), like its client's
 * `useActiveOrganization`, server-rendered: null when there's none. It follows the session, so switching
 * organizations (here, on the account page or with `<AuthOrganizationSwitcher>`) updates it; `activeTeamId` is the
 * active team, with teams on.
 */
export const useAuthActiveOrganization = (): {
    organization: ComputedRef<ActiveOrganization | null>;
    activeTeamId: ComputedRef<string | null>;
    refresh: () => Promise<void>;
} => {
    const { session } = useUserSession();
    const activeId = computed(
        () => (session.value as { activeOrganizationId?: string | null } | null)?.activeOrganizationId ?? null
    );
    const activeTeamId = computed(
        () => (session.value as { activeTeamId?: string | null } | null)?.activeTeamId ?? null
    );
    // Only with an active organization: none for the signed-out, or without the Organization plugin.
    const { data, refresh } = useFetch<ActiveOrganization | null>('/api/auth/organization/get-full-organization', {
        key: 'better-auth-ui-active-organization',
        query: computed(() => (activeId.value ? { organizationId: activeId.value } : {})),
        default: () => null,
        enabled: () => !!activeId.value
    });
    return {
        organization: computed(() => (activeId.value ? data.value : null)),
        activeTeamId,
        refresh: () => refresh()
    };
};
