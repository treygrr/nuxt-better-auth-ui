import {
    createError,
    defineEventHandler,
    getRequestHeader,
    getRequestIP,
    getRouterParam,
    useRuntimeConfig
} from '#imports';

import { writeAuditEntry, type AuditPerson } from '../../audit/plugin';
import { requireAdminPermission, requireUser } from '../../utils/admin';

/**
 * Removes one of a user's sign-in methods. Like Better Auth's own unlink-account endpoint, it refuses to remove
 * the last one, which would lock them out, unless the app sets `account.accountLinking.allowUnlinkingAll`.
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context } = await requireAdminPermission(event, { user: ['update'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));

    const accounts = await context.internalAdapter.findAccounts(user.id);
    const account = accounts.find((item) => item.id === getRouterParam(event, 'accountId'));
    // Each error's code is translated on the pages (errors.<code>); the message is the English fallback.
    if (!account) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Sign-in method not found',
            data: { code: 'ACCOUNT_NOT_FOUND' }
        });
    }
    if (accounts.length === 1 && !context.options.account?.accountLinking?.allowUnlinkingAll) {
        throw createError({
            statusCode: 400,
            statusMessage: 'This is their only sign-in method. Removing it would lock them out.',
            data: { code: 'LAST_SIGN_IN_METHOD' }
        });
    }

    await context.internalAdapter.deleteAccount(account.id);
    const config = (
        useRuntimeConfig().public.betterAuthUi as { admin: { auditLog: boolean; auditLogRetentionDays: number } }
    ).admin;
    if (config.auditLog) {
        await writeAuditEntry(
            context as never,
            {
                action: 'account.remove',
                actor: admin as AuditPerson,
                target: user as AuditPerson,
                details: { providerId: account.providerId },
                ipAddress: getRequestIP(event, { xForwardedFor: true }) ?? null,
                userAgent: getRequestHeader(event, 'user-agent') ?? null
            },
            config.auditLogRetentionDays
        );
    }
    return { removed: account.id };
});
