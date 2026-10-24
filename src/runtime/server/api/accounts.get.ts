import { createError, defineEventHandler, getQuery } from '#imports';

import { findAll, requireAdminPermission } from '../utils/admin';

/** The most users one request may ask about: a few pages of the users list. */
const MAX_USERS = 100;

/**
 * The sign-in methods of several users at once, as `{ [userId]: providerIds }`, for the users list. Reads only
 * the user and provider of each account. Same permission as viewing a user.
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['get'] });

    const { userIds } = getQuery(event);
    const ids = [
        ...new Set(
            String(userIds ?? '')
                .split(',')
                .filter(Boolean)
        )
    ];
    if (ids.length > MAX_USERS) {
        throw createError({ statusCode: 400, statusMessage: `Ask about at most ${MAX_USERS} users at a time` });
    }

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
