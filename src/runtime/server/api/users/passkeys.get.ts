import { defineEventHandler, getRouterParam } from '#imports';

import { requireAdminPermission, requireUser } from '../../utils/admin';

/** A user's passkey, without its key material. */
export type AdminPasskey = {
    id: string;
    name: string | null;
    deviceType: string | null;
    backedUp: boolean;
    createdAt: Date | null;
};

/**
 * A user's passkeys. Better Auth's Passkey plugin only lists the signed-in user's own, so this reads them with Better
 * Auth's adapter, by user id, after the permission check the Admin plugin uses for viewing a user.
 */
export default defineEventHandler(async (event): Promise<AdminPasskey[]> => {
    const { context } = await requireAdminPermission(event, { user: ['get'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));
    if (!context.getPlugin('passkey')) return [];
    const rows = await context.adapter.findMany<AdminPasskey & Record<string, unknown>>({
        model: 'passkey',
        where: [{ field: 'userId', value: user.id }],
        select: ['id', 'name', 'deviceType', 'backedUp', 'createdAt']
    });
    // Only these fields: never the public key or credential id.
    return rows.map(({ id, name, deviceType, backedUp, createdAt }) => ({
        id,
        name: name ?? null,
        deviceType: deviceType ?? null,
        backedUp: !!backedUp,
        createdAt: createdAt ?? null
    }));
});
