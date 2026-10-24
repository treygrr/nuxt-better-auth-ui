import { defineEventHandler } from '#imports';

import { findAll, requireAdminPermission } from '../utils/admin';

/**
 * The sign-in methods in use, plus any social providers the app has configured, for the users list's
 * sign-in filter. `credential` is email and password.
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['list'] });
    const used = await findAll<{ providerId: string }>(context, { model: 'account', select: ['providerId'] });
    const configured = Object.keys((context.options as { socialProviders?: object }).socialProviders ?? {});
    return [...new Set([...used.map((row) => row.providerId), ...configured])];
});
