import type { DropdownMenuItem } from '@nuxt/ui';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { navigateTo, useAdminCan, useAdminUsers, useBetterAuthAdminConfig, useToast } from '#imports';

import type { AdminUser } from '../types';

/**
 * The "Sign in as …" menu item for a user, or null when the module's `impersonation` option is off or the
 * admin's role can't impersonate. Disabled, with the reason, for yourself, admins (Better Auth refuses them
 * without the impersonate-admins permission) and banned users (Better Auth refuses their sessions).
 */
export const useImpersonateItem = () => {
    const { impersonation } = useBetterAuthAdminConfig();
    const can = useAdminCan();
    const session = useUserSession();
    const admin = useAdminUsers();
    const toast = useToast();

    return (user: AdminUser): DropdownMenuItem | null => {
        if (!impersonation || !can({ user: ['impersonate'] })) return null;
        // Better Auth's default adminRoles: users with the `admin` role need impersonate-admins to be impersonated.
        const isAdmin = (user.role ?? 'user').split(',').includes('admin');
        const reason =
            user.id === session.user.value?.id
                ? 'you'
                : isAdmin && !can({ user: ['impersonate-admins'] })
                  ? 'an admin'
                  : user.banned
                    ? 'banned'
                    : null;
        return {
            label: reason ? `Sign in as ${user.name} (${reason})` : `Sign in as ${user.name}`,
            icon: 'i-lucide-venetian-mask',
            disabled: !!reason,
            onSelect: async () => {
                try {
                    await admin.impersonate(user.id);
                    // A full load, so the whole app picks up the new session.
                    await navigateTo('/', { external: true });
                } catch (error) {
                    toast.add({
                        title: "Couldn't sign in as them",
                        description: (error as Error).message,
                        color: 'error'
                    });
                }
            }
        };
    };
};
