import { defineEventHandler, getRouterParam } from '#imports';

import { requireAdminPermission, requireUser } from '../../utils/admin';

/** A user's API key, without the key (Better Auth stores only its hash anyway). */
export type AdminApiKey = {
    id: string;
    name: string | null;
    start: string | null;
    enabled: boolean;
    permissions: string | null;
    expiresAt: Date | null;
    lastRequest: Date | null;
    createdAt: Date;
};

/**
 * A user's API keys. Better Auth's API Key plugin only lists the signed-in user's own, so this reads its `apikey`
 * table with Better Auth's adapter, after the permission check the Admin plugin uses for viewing a user. Keys kept in
 * secondary storage only (`storage: 'secondary-storage'`) aren't in the table, so aren't listed.
 */
export default defineEventHandler(async (event): Promise<AdminApiKey[]> => {
    const { context } = await requireAdminPermission(event, { user: ['get'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));
    if (!context.getPlugin('api-key')) return [];
    const rows = await context.adapter.findMany<AdminApiKey & Record<string, unknown>>({
        model: 'apikey',
        where: [{ field: 'referenceId', value: user.id }],
        select: ['id', 'name', 'start', 'enabled', 'permissions', 'expiresAt', 'lastRequest', 'createdAt'],
        sortBy: { field: 'createdAt', direction: 'desc' },
        limit: 200
    });
    return rows.map(({ id, name, start, enabled, permissions, expiresAt, lastRequest, createdAt }) => ({
        id,
        name: name ?? null,
        start: start ?? null,
        enabled: enabled !== false,
        permissions: permissions ?? null,
        expiresAt: expiresAt ?? null,
        lastRequest: lastRequest ?? null,
        createdAt
    }));
});
