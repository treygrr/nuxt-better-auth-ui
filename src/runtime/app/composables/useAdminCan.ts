import { useUserSession } from '@nuxtjs/better-auth/composables';
import { roles } from '#better-auth-ui/roles';

export type AdminPermissions = { user?: string[]; session?: string[] };

/**
 * Whether the signed-in user's role allows these Better Auth Admin permissions, eg
 * `can({ user: ['ban'] })`. It checks the same roles file Better Auth uses on the server, so the pages show
 * exactly what the server would allow, and render the same on the server and in the browser.
 */
export const useAdminCan = () => {
    const session = useUserSession();
    return (permissions: AdminPermissions) => {
        const role = (session.user.value as { role?: string | null } | null)?.role || 'user';
        // Better Auth stores several roles comma-separated; any of them granting it is enough.
        return role.split(',').some((name) => roles[name.trim()]?.authorize(permissions).success === true);
    };
};
