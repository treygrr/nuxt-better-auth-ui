import { defineEventHandler } from '#imports';
import * as z from 'zod';

import { findAll, requireAdminPermission } from '../utils/admin';
import { idList, readQuery } from '../utils/input';

/** The most users one request may ask about: a few pages of the users list. */
const MAX_USERS = 100;

const Query = z.object({ userIds: idList(MAX_USERS) });

/**
 * The sign-in methods of several users at once, as `{ [userId]: providerIds }`, for the users list. Reads only
 * the user and provider of each account. Same permission as viewing a user.
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['get'] });
    const { userIds: ids } = readQuery(event, Query, {
        default: { code: 'TOO_MANY_USERS', message: `Ask about at most ${MAX_USERS} users at a time` }
    });

    const providers: Record<string, string[]> = Object.fromEntries(ids.map((id) => [id, []]));
    if (!ids.length) return providers;

    const accounts = await findAll<{ userId: string; providerId: string }>(context, {
        model: 'account',
        where: [{ field: 'userId', operator: 'in', value: ids }],
        select: ['userId', 'providerId']
    });
    for (const { userId, providerId } of accounts) providers[userId]?.push(providerId);
    return providers;
});
