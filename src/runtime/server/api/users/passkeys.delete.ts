import { createError, defineEventHandler, getRouterParam } from '#imports';

import type { AuditPerson } from '../../audit/plugin';
import { recordAdminAction, requireAdminPermission, requireUser } from '../../utils/admin';

/** Removes one of a user's passkeys, eg on a lost device. The Passkey plugin only lets users remove their own. */
export default defineEventHandler(async (event) => {
    const { user: admin, context } = await requireAdminPermission(event, { user: ['update'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));
    if (!context.getPlugin('passkey'))
        throw createError({
            statusCode: 400,
            statusMessage: "This app doesn't use passkeys",
            data: { code: 'PASSKEYS_NOT_USED' }
        });

    const passkeyId = getRouterParam(event, 'passkeyId');
    const [passkey] = await context.adapter.findMany<{ id: string; name?: string | null }>({
        model: 'passkey',
        where: [
            { field: 'id', value: passkeyId },
            { field: 'userId', value: user.id, connector: 'AND' }
        ],
        limit: 1
    });
    if (!passkey)
        throw createError({ statusCode: 404, statusMessage: 'Passkey not found', data: { code: 'PASSKEY_NOT_FOUND' } });
    await context.adapter.delete({ model: 'passkey', where: [{ field: 'id', value: passkey.id }] });

    await recordAdminAction(event, context, {
        action: 'user.passkey-remove',
        actor: admin as AuditPerson,
        target: user as AuditPerson,
        details: { name: passkey.name ?? null }
    });
    return { removed: passkey.id };
});
