import { createError, defineEventHandler, getRouterParam } from '#imports';

import type { AuditPerson } from '../../audit/plugin';
import { recordAdminAction, requireAdminPermission, requireUser } from '../../utils/admin';

/**
 * Turns a user's two-factor off, for someone who lost their authenticator app and backup codes. Better Auth has no
 * admin endpoint for it, so this does what the Two-Factor plugin's own disable does: deletes their two-factor row
 * (the app's secret and backup codes) and clears `twoFactorEnabled`, then forgets their trusted devices. They can
 * set it up again from their account page; users who must have it are asked to.
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context } = await requireAdminPermission(event, { user: ['update'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));
    const plugin = context.getPlugin('two-factor');
    if (!plugin) throw createError({ statusCode: 400, statusMessage: "This app doesn't use two-factor" });

    await context.adapter.deleteMany({
        model: (plugin.options?.twoFactorTable as string | undefined) ?? 'twoFactor',
        where: [{ field: 'userId', value: user.id }]
    });
    await context.internalAdapter.updateUser(user.id, { twoFactorEnabled: false });
    // Trusted devices, kept by the plugin in Better Auth's verification table.
    await context.adapter.deleteMany({
        model: 'verification',
        where: [
            { field: 'identifier', operator: 'starts_with', value: 'trust-device-' },
            { field: 'value', value: user.id, connector: 'AND' }
        ]
    });

    await recordAdminAction(event, context, {
        action: 'user.two-factor-reset',
        actor: admin as AuditPerson,
        target: user as AuditPerson
    });
    return { reset: true };
});
