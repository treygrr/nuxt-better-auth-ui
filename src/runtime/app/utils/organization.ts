import { useAuthClient } from '@nuxtjs/better-auth/composables';
import type { Ref } from 'vue';
import { useAuthI18n, useToast, watch } from '#imports';

type Result = Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
type Permissions = Record<string, string[]>;

/** Better Auth's Organization plugin client methods the organization's page uses (the app's typed client may lack them). */
export type OrganizationClient = {
    create(input: Record<string, unknown> & { name: string; slug: string }): Result;
    acceptInvitation(input: { invitationId: string }): Result;
    rejectInvitation(input: { invitationId: string }): Result;
    setActive(input: { organizationId: string | null }): Result;
    update(input: { organizationId: string; data: Record<string, unknown> }): Result;
    delete(input: { organizationId: string }): Result;
    leave(input: { organizationId: string }): Result;
    checkSlug(input: { slug: string }): Result;
    inviteMember(
        input: Record<string, unknown> & { email: string; role: string | string[]; organizationId: string }
    ): Result;
    cancelInvitation(input: { invitationId: string }): Result;
    updateMemberRole(input: { memberId: string; role: string | string[]; organizationId: string }): Result;
    removeMember(input: { memberIdOrEmail: string; organizationId: string }): Result;
    createTeam(input: Record<string, unknown> & { name: string; organizationId: string }): Result;
    updateTeam(input: { teamId: string; data: Record<string, unknown> }): Result;
    removeTeam(input: { teamId: string; organizationId: string }): Result;
    addTeamMember(input: { teamId: string; userId: string }): Result;
    removeTeamMember(input: { teamId: string; userId: string }): Result;
    setActiveTeam(input: { teamId: string | null }): Result;
    createRole(input: { role: string; permission: Permissions; organizationId: string }): Result;
    updateRole(input: {
        roleId: string;
        organizationId: string;
        data: { permission?: Permissions; roleName?: string };
    }): Result;
    deleteRole(input: { roleId: string; organizationId: string }): Result;
};

/** Runs Better Auth's organization calls, saying in a toast when one worked (if given words) or why it didn't. */
export function useOrganizationActions() {
    const { t, errorMessage } = useAuthI18n();
    const toast = useToast();
    const client = () => (useAuthClient() as unknown as { organization: OrganizationClient }).organization;
    /** The call's data (true when it has none), or null when it failed. */
    async function run(call: (organization: OrganizationClient) => Result, done?: string) {
        const { data, error } = await call(client());
        if (error) {
            toast.add({ title: t('organization.failed'), description: errorMessage(error), color: 'error' });
            return null;
        }
        if (done) toast.add({ title: done, color: 'success' });
        return data ?? true;
    }
    return { client, run };
}

/** Better Auth stores several roles as one comma-separated string. */
/** A name as a URL slug: lowercase ASCII letters and digits, with hyphens. */
export const slugify = (text: string) =>
    text
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

/** Keeps a form's slug following its name, until the slug is edited. */
export function slugFollowsName(form: { name: string; slug: string }, slugEdited: Ref<boolean>) {
    watch(
        () => form.name,
        (name) => {
            if (!slugEdited.value) form.slug = slugify(name);
        }
    );
}

export const splitRoles = (role: string | null | undefined) =>
    (role ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

/** A dynamic role's permissions, which Better Auth may hand back as JSON text. */
export const parsePermissions = (permission: unknown): Permissions => {
    if (typeof permission !== 'string') return (permission as Permissions | null) ?? {};
    try {
        return JSON.parse(permission) as Permissions;
    } catch {
        return {};
    }
};
