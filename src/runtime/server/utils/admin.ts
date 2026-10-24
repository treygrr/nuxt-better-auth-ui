import type { H3Event } from 'h3';
// Nitro's own imports: h3 v1, which the auth module's server utilities are typed against.
import { createError, requireUserSession, serverAuth } from '#imports';

/** A user's sign-in method as Better Auth stores it, including fields that must never be returned. */
export type StoredAccount = {
    id: string;
    userId: string;
    providerId: string;
    accountId: string;
    scope?: string | null;
    createdAt: Date;
    updatedAt: Date;
} & Record<string, unknown>;

// The Admin plugin is added by this module, so the app's typed auth instance doesn't know its API.
type AdminAuth = {
    api: {
        userHasPermission(input: {
            body: { userId: string; permissions: Record<string, string[]> };
        }): Promise<{ success: boolean }>;
    };
    $context: Promise<{
        options: { account?: { accountLinking?: { allowUnlinkingAll?: boolean } } };
        internalAdapter: {
            findUserById(id: string): Promise<{ id: string } | null>;
            findAccounts(userId: string): Promise<StoredAccount[]>;
            deleteAccount(id: string): Promise<void>;
        };
    }>;
};

/**
 * Requires a session whose user has the given Better Auth Admin permissions, the same check the Admin plugin's
 * own endpoints make, and returns Better Auth's context for the request.
 */
export async function requireAdminPermission(event: H3Event, permissions: Record<string, string[]>) {
    const { user } = await requireUserSession(event);
    const auth = serverAuth(event) as unknown as AdminAuth;
    const { success } = await auth.api.userHasPermission({ body: { userId: user.id, permissions } });
    if (!success) throw createError({ statusCode: 403, statusMessage: 'You are not allowed to do this' });
    return { user, context: await auth.$context };
}

/** The user in the route's `:id`, or a 404. */
export async function requireUser(context: Awaited<AdminAuth['$context']>, userId: string | undefined) {
    const user = userId ? await context.internalAdapter.findUserById(userId) : null;
    if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' });
    return user;
}
