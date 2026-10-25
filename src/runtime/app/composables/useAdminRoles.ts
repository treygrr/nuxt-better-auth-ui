import type { ComputedRef, Ref } from 'vue';
import { computed, useFetch } from '#imports';

/** A role as the roles plugin lists it: its permissions and how many users have it. */
export type AdminRole = { name: string; permissions: Record<string, string[]>; builtIn: boolean; users: number };

/**
 * Every role, from Better Auth (`/api/auth/admin-roles/list`), fetched during server rendering and shared by
 * every caller. `staff` are the roles that can list users, so open the admin pages.
 */
export const useAdminRoles = (): {
    roles: Ref<AdminRole[]>;
    names: ComputedRef<string[]>;
    staff: ComputedRef<string[]>;
    refresh: () => Promise<void>;
    error: Ref<unknown>;
} => {
    const {
        data: roles,
        refresh,
        error
    } = useFetch<AdminRole[]>('/api/auth/admin-roles/list', {
        key: 'better-auth-admin-roles',
        default: () => []
    });
    return {
        roles,
        names: computed(() => roles.value.map((role) => role.name)),
        staff: computed(() =>
            roles.value.filter((role) => role.permissions.user?.includes('list')).map((role) => role.name)
        ),
        refresh: () => refresh(),
        error
    };
};
