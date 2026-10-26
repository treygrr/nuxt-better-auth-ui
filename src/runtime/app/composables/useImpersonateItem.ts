import type { DropdownMenuItem } from '@nuxt/ui';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import {
    navigateTo,
    useBetterAuthAdminCan,
    useBetterAuthAdminUsers,
    useAuthI18n,
    useBetterAuthAdminConfig,
    useToast
} from '#imports';

import type { AdminUser } from '../types';

/**
 * The "Sign in as …" menu item for a user, or null when the module's `impersonation` option is off or the
 * admin's role can't impersonate. Disabled, with the reason, for yourself, admins (Better Auth refuses them
 * without the impersonate-admins permission) and banned users (Better Auth refuses their sessions).
 */
export const useImpersonateItem = () => {
    const { impersonation } = useBetterAuthAdminConfig();
    const can = useBetterAuthAdminCan();
    const session = useUserSession();
    const admin = useBetterAuthAdminUsers();
    const toast = useToast();
    const { t } = useAuthI18n();

    return (user: AdminUser): DropdownMenuItem | null => {
        if (!impersonation || !can({ user: ['impersonate'] })) return null;
        // Better Auth's default adminRoles: users with the `admin` role need impersonate-admins to be impersonated.
        const isAdmin = (user.role ?? 'user').split(',').includes('admin');
        const reason =
            user.id === session.user.value?.id
                ? t('admin.impersonation.reasons.you')
                : isAdmin && !can({ user: ['impersonate-admins'] })
                  ? t('admin.impersonation.reasons.admin')
                  : user.banned
                    ? t('admin.impersonation.reasons.banned')
                    : null;
        return {
            label: reason
                ? t('admin.impersonation.signInAsUnavailable', { name: user.name, reason })
                : t('admin.impersonation.signInAs', { name: user.name }),
            icon: 'i-lucide-venetian-mask',
            disabled: !!reason,
            onSelect: async () => {
                try {
                    await admin.impersonate(user.id);
                    // A full load, so the whole app picks up the new session.
                    await navigateTo('/', { external: true });
                } catch (error) {
                    toast.add({
                        title: t('admin.impersonation.failed'),
                        description: (error as Error).message,
                        color: 'error'
                    });
                }
            }
        };
    };
};
