import { defineEventHandler, getQuery } from '#imports';

import { requireAdminPermission, type Where } from '../utils/admin';

const MAX_LIMIT = 100;

type Session = {
    id: string;
    token: string;
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    impersonatedBy?: string | null;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
};
type User = { id: string; name: string; email: string; image?: string | null };

/**
 * Every unexpired session, most recently active first, a page at a time, with its user. Better Auth's Admin plugin
 * lists one user's sessions only, so this reads them itself, with the same permission (session: list). It reads
 * only when an admin opens the page.
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { session: ['list'] });
    // Sessions kept only in secondary storage (eg Redis) aren't in the database to list.
    const options = context.options as { secondaryStorage?: unknown; session?: { storeSessionInDatabase?: boolean } };
    if (options.secondaryStorage && !options.session?.storeSessionInDatabase) {
        return { sessions: [], total: 0, available: false };
    }

    const query = getQuery(event);
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), MAX_LIMIT);
    const offset = Math.max(Number(query.offset) || 0, 0);
    const where: Where[] = [{ field: 'expiresAt', operator: 'gt', value: new Date() }];

    const [sessions, total] = await Promise.all([
        context.adapter.findMany<Session>({
            model: 'session',
            where,
            limit,
            offset,
            sortBy: { field: 'updatedAt', direction: 'desc' }
        }),
        context.adapter.count({ model: 'session', where })
    ]);
    const userIds = [...new Set(sessions.map((session) => session.userId))];
    const users = userIds.length
        ? await context.adapter.findMany<User>({
              model: 'user',
              where: [{ field: 'id', operator: 'in', value: userIds }],
              limit: userIds.length
          })
        : [];
    const byId = new Map(
        users.map((user) => [user.id, { id: user.id, name: user.name, email: user.email, image: user.image ?? null }])
    );

    return {
        sessions: sessions.map((session) => ({
            id: session.id,
            // Better Auth's revoke-user-session takes the token, as its list-user-sessions returns it.
            token: session.token,
            ipAddress: session.ipAddress ?? null,
            userAgent: session.userAgent ?? null,
            impersonatedBy: session.impersonatedBy ?? null,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            expiresAt: session.expiresAt,
            user: byId.get(session.userId) ?? null
        })),
        total: Number(total),
        available: true
    };
});
