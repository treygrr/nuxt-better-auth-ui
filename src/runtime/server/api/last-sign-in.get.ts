import { createError, defineEventHandler, getQuery } from '#imports';

import { AUDIT_MODEL } from '../audit/plugin';
import { requireAdminPermission } from '../utils/admin';

const MAX_USERS = 100;

/**
 * When each user last signed in, as `{ [userId]: date | null }`, from the audit log's sign-in events: no extra
 * writes, so it only knows sign-ins within the log's retention. One indexed query per user.
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['list'] });
    const ids = [
        ...new Set(
            String(getQuery(event).userIds ?? '')
                .split(',')
                .filter(Boolean)
        )
    ];
    if (ids.length > MAX_USERS) {
        throw createError({ statusCode: 400, statusMessage: `Ask about at most ${MAX_USERS} users at a time` });
    }
    const latest = await Promise.all(
        ids.map(async (id) => {
            const [entry] = await context.adapter.findMany<{ createdAt: Date }>({
                model: AUDIT_MODEL,
                where: [
                    { field: 'actorId', value: id },
                    { field: 'action', value: 'auth.sign-in' }
                ],
                limit: 1,
                sortBy: { field: 'createdAt', direction: 'desc' }
            });
            return [id, entry?.createdAt ?? null] as const;
        })
    );
    return Object.fromEntries(latest);
});
