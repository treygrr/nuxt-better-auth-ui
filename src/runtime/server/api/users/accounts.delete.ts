import { createError, defineEventHandler, getRouterParam } from '#imports';

import { requireAdminPermission, requireUser } from '../../utils/admin';

/**
 * Removes one of a user's sign-in methods. Like Better Auth's own unlink-account endpoint, it refuses to remove
 * the last one, which would lock them out, unless the app sets `account.accountLinking.allowUnlinkingAll`.
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['update'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));

    const accounts = await context.internalAdapter.findAccounts(user.id);
    const account = accounts.find((item) => item.id === getRouterParam(event, 'accountId'));
    if (!account) throw createError({ statusCode: 404, statusMessage: 'Sign-in method not found' });
    if (accounts.length === 1 && !context.options.account?.accountLinking?.allowUnlinkingAll) {
        throw createError({
            statusCode: 400,
            statusMessage: 'This is their only sign-in method. Removing it would lock them out.'
        });
    }

    await context.internalAdapter.deleteAccount(account.id);
    return { removed: account.id };
});
