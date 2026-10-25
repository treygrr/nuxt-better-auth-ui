import {
    abortNavigation,
    createError,
    defineNuxtRouteMiddleware,
    useBetterAuthAdminConfig,
    useNuxtApp,
    useRequestFetch
} from '#imports';

import { useAdminPermissions, type AdminPermissionsState } from '../composables/useAdminCan';

/**
 * On the admin pages: loads what the signed-in user may do (Better Auth's answer, through the roles plugin), and
 * keeps out roles that can't list users. Roles change at runtime, so route rules can't name them.
 */
export default defineNuxtRouteMiddleware(async (to) => {
    const { route } = useBetterAuthAdminConfig();
    if (to.path !== route && !to.path.startsWith(`${route}/`)) return;

    const state = useAdminPermissions();
    const nuxtApp = useNuxtApp();
    // While hydrating, the permissions the server rendered with are already in the payload.
    if (!(import.meta.client && nuxtApp.isHydrating && state.value)) {
        try {
            state.value = await useRequestFetch()<AdminPermissionsState>('/api/auth/admin-roles/permissions');
        } catch (error) {
            state.value = null;
            // Signed out: the auth module's middleware sends them to the login page.
            if ((error as { statusCode?: number }).statusCode === 401) return;
        }
    }
    if (!state.value?.permissions.user?.includes('list')) {
        return abortNavigation(createError({ statusCode: 403, statusMessage: "Your role can't use the admin pages" }));
    }
});
