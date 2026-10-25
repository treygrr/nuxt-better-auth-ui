import { defineEventHandler, getRouterParam } from '#imports';

import { NOTES_MODEL, type UserNote } from '../../notes/plugin';
import { requireAdminPermission, requireUser } from '../../utils/admin';

/** Staff notes on a user, newest first, for anyone who can view the user. */
export default defineEventHandler(async (event): Promise<UserNote[]> => {
    const { context } = await requireAdminPermission(event, { user: ['get'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));
    return context.adapter.findMany<UserNote>({
        model: NOTES_MODEL,
        where: [{ field: 'userId', value: user.id }],
        sortBy: { field: 'createdAt', direction: 'desc' },
        limit: 500
    });
});
