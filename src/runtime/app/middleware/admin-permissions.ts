import { abortNavigation, createError, defineNuxtRouteMiddleware, useBetterAuthAdminCan } from '#imports';

import type { BetterAuthAdminPageMeta } from '../utils/config';

/**
 * The app's admin pages that need permissions (`definePageMeta({ betterAuthAdmin: { permissions } })`): a 403 for
 * staff whose role doesn't grant them. Everyone else is left to the admin route's own rule, which sends them to sign
 * in, as on the module's pages: staff are the roles that can list users.
 */
export default defineNuxtRouteMiddleware((to) => {
    const permissions = (to.meta.betterAuthAdmin as BetterAuthAdminPageMeta | undefined)?.permissions;
    if (!permissions) return;
    const can = useBetterAuthAdminCan();
    if (!can({ user: ['list'] }) || can(permissions)) return;
    return abortNavigation(
        createError({ statusCode: 403, statusMessage: 'You are not allowed to do this', data: { code: 'NOT_ALLOWED' } })
    );
});
