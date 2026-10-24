// Nitro's own imports: h3 v1, which the auth module's server utilities are typed against.
import { createError, defineEventHandler, getRouterParam, requireUserSession, serverAuth } from '#imports';

/** A user's sign-in methods, without passwords or tokens. */
export type AdminAccount = {
    id: string;
    providerId: string;
    accountId: string;
    scope: string | null;
    createdAt: Date;
    updatedAt: Date;
};

type StoredAccount = AdminAccount & Record<string, unknown>;

// The Admin plugin is added by this module, so the app's typed auth instance doesn't know its API.
type AdminAuth = {
    api: {
        userHasPermission(input: {
            body: { userId: string; permissions: Record<string, string[]> };
        }): Promise<{ success: boolean }>;
    };
    $context: Promise<{
        internalAdapter: {
            findUserById(id: string): Promise<{ id: string } | null>;
            findAccounts(userId: string): Promise<StoredAccount[]>;
        };
    }>;
};

/**
 * Lists a user's linked sign-in methods (email and password, Google, GitHub, …). Better Auth's Admin plugin has no
 * endpoint for this, so it reads them with Better Auth's own adapter, after the same permission check the plugin
 * uses for viewing a user.
 */
export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event);
    const auth = serverAuth(event) as unknown as AdminAuth;

    const { success } = await auth.api.userHasPermission({
        body: { userId: user.id, permissions: { user: ['get'] } }
    });
    if (!success) throw createError({ statusCode: 403, statusMessage: 'You are not allowed to view users' });

    const userId = getRouterParam(event, 'id');
    const context = await auth.$context;
    if (!userId || !(await context.internalAdapter.findUserById(userId))) {
        throw createError({ statusCode: 404, statusMessage: 'User not found' });
    }

    // Only these fields: never the password hash or OAuth tokens.
    const accounts = await context.internalAdapter.findAccounts(userId);
    return accounts.map(({ id, providerId, accountId, scope, createdAt, updatedAt }): AdminAccount => ({
        id,
        providerId,
        accountId,
        scope: scope ?? null,
        createdAt,
        updatedAt
    }));
});
