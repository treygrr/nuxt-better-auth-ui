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

export type Where = { field: string; operator?: string; value: unknown; connector?: 'AND' | 'OR' };
type FindMany = {
    model: string;
    where?: Where[];
    select?: string[];
    limit?: number;
    offset?: number;
    sortBy?: { field: string; direction: 'asc' | 'desc' };
};

// The Admin plugin is added by this module, so the app's typed auth instance doesn't know its API.
type AdminAuth = {
    api: {
        userHasPermission(input: {
            body: { userId: string; permissions: Record<string, string[]> };
        }): Promise<{ success: boolean }>;
    };
    $context: Promise<{
        options: {
            account?: { accountLinking?: { allowUnlinkingAll?: boolean } };
            secondaryStorage?: unknown;
            session?: { storeSessionInDatabase?: boolean };
        };
        adapter: {
            findMany<T>(query: FindMany): Promise<T[]>;
            count(query: { model: string; where?: Where[] }): Promise<number | string>;
        };
        internalAdapter: {
            findUserById(
                id: string
            ): Promise<{ id: string; email: string; name: string; emailVerified?: boolean } | null>;
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
    return { user, context: await auth.$context, auth };
}

export type AdminContext = Awaited<AdminAuth['$context']>;

/**
 * Every matching row. Better Auth's adapters return at most 100 rows when no limit is given, so this reads them
 * a page at a time.
 */
export async function findAll<T>(context: AdminContext, query: Omit<FindMany, 'limit' | 'offset' | 'sortBy'>) {
    const PAGE = 1000;
    const rows: T[] = [];
    for (let offset = 0; ; offset += PAGE) {
        const page = await context.adapter.findMany<T>({
            ...query,
            // Paging sorts by id, which the query must then select.
            ...(query.select && { select: [...new Set(['id', ...query.select])] }),
            limit: PAGE,
            offset,
            sortBy: { field: 'id', direction: 'asc' }
        });
        rows.push(...page);
        if (page.length < PAGE) return rows;
    }
}

/** The user in the route's `:id`, or a 404. */
export async function requireUser(context: AdminContext, userId: string | undefined) {
    const user = userId ? await context.internalAdapter.findUserById(userId) : null;
    if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' });
    return user;
}
