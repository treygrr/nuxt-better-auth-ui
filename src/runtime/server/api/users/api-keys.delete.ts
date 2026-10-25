import { createError, defineEventHandler, getRouterParam } from '#imports';

import type { AuditPerson } from '../../audit/plugin';
import { recordAdminAction, requireAdminPermission, requireUser } from '../../utils/admin';

/**
 * Revokes one of a user's API keys, eg a leaked one. Better Auth's API Key plugin only lets owners delete their own,
 * so this does what its delete does (removes the row) after the Admin plugin's `user: update` permission check.
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context } = await requireAdminPermission(event, { user: ['update'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));
    if (!context.getPlugin('api-key'))
        throw createError({ statusCode: 400, statusMessage: "This app doesn't use API keys" });

    const [key] = await context.adapter.findMany<{ id: string; name?: string | null }>({
        model: 'apikey',
        where: [
            { field: 'id', value: getRouterParam(event, 'keyId') },
            { field: 'referenceId', value: user.id, connector: 'AND' }
        ],
        limit: 1
    });
    if (!key) throw createError({ statusCode: 404, statusMessage: 'API key not found' });
    await context.adapter.delete({ model: 'apikey', where: [{ field: 'id', value: key.id }] });

    await recordAdminAction(event, context, {
        action: 'user.api-key-revoke',
        actor: admin as AuditPerson,
        target: user as AuditPerson,
        details: { name: key.name ?? null }
    });
    return { removed: key.id };
});
