import { defineEventHandler } from '#imports';
import * as z from 'zod';

import { ACTIVITY_MODEL } from '../activity/plugin';
import { requireAdminPermission } from '../utils/admin';
import { idList, readQuery } from '../utils/input';

const MAX_USERS = 100;

const Query = z.object({ userIds: idList(MAX_USERS) });

/** When each user was last active, as `{ [userId]: date | null }`, from activity tracking. One query. */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['list'] });
    const { userIds: ids } = readQuery(event, Query, {
        default: { code: 'TOO_MANY_USERS', message: `Ask about at most ${MAX_USERS} users at a time` }
    });
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
