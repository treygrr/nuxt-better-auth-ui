import { useState } from '#imports';

export type AdminPermissions = { user?: string[]; session?: string[] };
/** What the signed-in user may do, from Better Auth (`/api/auth/admin-roles/permissions`). */
export type AdminPermissionsState = { permissions: Record<string, string[]>; manageRoles: boolean };

/** The signed-in user's permissions, loaded by the admin pages' route middleware and sent with the page. */
export const useAdminPermissions = () =>
    useState<AdminPermissionsState | null>('better-auth-admin-permissions', () => null);

/**
 * Whether the signed-in user's role allows these Better Auth Admin permissions, eg `can({ user: ['ban'] })`.
 * The permissions come from the server, which asks Better Auth, so the pages show exactly what it would allow,
 * the same in the server render and the browser.
 */
export const useAdminCan = () => {
    const state = useAdminPermissions();
    return (permissions: AdminPermissions) =>
        Object.entries(permissions).every(([resource, actions]) =>
            (actions ?? []).every((action) => state.value?.permissions[resource]?.includes(action) === true)
        );
};
