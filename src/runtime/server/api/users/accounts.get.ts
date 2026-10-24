import { defineEventHandler, getRouterParam } from '#imports';

import { requireAdminPermission, requireUser } from '../../utils/admin';

/** A user's sign-in method, without passwords or tokens. */
export type AdminAccount = {
    id: string;
    providerId: string;
    accountId: string;
    scope: string | null;
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Lists a user's linked sign-in methods (email and password, Google, GitHub, …). Better Auth's Admin plugin has no
 * endpoint for this, so it reads them with Better Auth's own adapter, after the permission check the plugin uses
 * for viewing a user.
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['get'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));

    // Only these fields: never the password hash or OAuth tokens.
    const accounts = await context.internalAdapter.findAccounts(user.id);
    return accounts.map(({ id, providerId, accountId, scope, createdAt, updatedAt }): AdminAccount => ({
        id,
        providerId,
        accountId,
        scope: scope ?? null,
        createdAt,
        updatedAt
    }));
});
