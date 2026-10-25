import { defineShortcuts, useAdminCan, useAdminPath, useBetterAuthAdminConfig, useRouter } from '#imports';
import { createSharedComposable } from '@vueuse/core';

/**
 * The admin pages' keyboard shortcuts, set up once by the layout: g then h (home), u (users), s (sessions),
 * a (audit log) or c (configuration).
 */
const _useDashboard = () => {
    const router = useRouter();
    const adminPath = useAdminPath();
    const { auditLog } = useBetterAuthAdminConfig();
    const can = useAdminCan();
    const go = (path: string) => () => router.push(adminPath(path));

    defineShortcuts({
        'g-h': go('/'),
        'g-u': go('/users'),
        ...(can({ session: ['list'] }) && { 'g-s': go('/sessions') }),
        ...(auditLog && { 'g-a': go('/audit') }),
        'g-c': go('/configuration')
    });
};

export const useAdminDashboard = createSharedComposable(_useDashboard);
