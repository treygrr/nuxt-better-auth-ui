import { createError, defineEventHandler, getQuery } from '#imports';

import { ACTIVITY_MODEL } from '../activity/plugin';
import { requireAdminPermission } from '../utils/admin';

const MAX_USERS = 100;

/** When each user was last active, as `{ [userId]: date | null }`, from activity tracking. One query. */
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
    const result: Record<string, Date | null> = Object.fromEntries(ids.map((id) => [id, null]));
    if (!ids.length) return result;
    const rows = await context.adapter.findMany<{ userId: string; lastActiveAt: Date }>({
        model: ACTIVITY_MODEL,
        where: [{ field: 'userId', operator: 'in', value: ids }],
        limit: ids.length
    });
    for (const row of rows) result[row.userId] = row.lastActiveAt;
    return result;
});
