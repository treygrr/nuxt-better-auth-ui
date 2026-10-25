import type { H3Event } from 'h3';
// Nitro's own imports: h3 v1, which the auth module's server utilities are typed against.
import {
    createError,
    getRequestHeader,
    getRequestIP,
    requireUserSession,
    serverAuth,
    useRuntimeConfig
} from '#imports';

import { writeAuditEntry, type AuditPerson } from '../audit/plugin';

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
        baseURL: string;
        options: {
            account?: { accountLinking?: { allowUnlinkingAll?: boolean } };
            secondaryStorage?: unknown;
            session?: { storeSessionInDatabase?: boolean };
        };
        adapter: {
            findMany<T>(query: FindMany): Promise<T[]>;
            count(query: { model: string; where?: Where[] }): Promise<number | string>;
            create<T>(query: { model: string; data: Record<string, unknown> }): Promise<T>;
            delete(query: { model: string; where: Where[] }): Promise<void>;
            deleteMany(query: { model: string; where: Where[] }): Promise<number>;
        };
        internalAdapter: {
            findUserById(
                id: string
            ): Promise<{ id: string; email: string; name: string; emailVerified?: boolean } | null>;
            findAccounts(userId: string): Promise<StoredAccount[]>;
            deleteAccount(id: string): Promise<void>;
            updateUser(id: string, data: Record<string, unknown>): Promise<unknown>;
        };
        getPlugin(id: string): { options?: Record<string, unknown> } | undefined;
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
    // The code is translated on the pages (errors.<code>); the message is the English fallback.
    if (!success) {
        throw createError({
            statusCode: 403,
            statusMessage: 'You are not allowed to do this',
            data: { code: 'NOT_ALLOWED' }
        });
    }
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

/** Records an admin action in the audit log, when it's on. Like the log's other writes, a failure never throws. */
export async function recordAdminAction(
    event: H3Event,
    context: AdminContext,
    entry: { action: string; actor: AuditPerson; target: AuditPerson; details?: Record<string, unknown> }
) {
    const config = (
        useRuntimeConfig().public.betterAuthUi as { admin: { auditLog: boolean; auditLogRetentionDays: number } }
    ).admin;
    if (!config.auditLog) return;
    await writeAuditEntry(
        context as never,
        {
            ...entry,
            details: entry.details ?? null,
            ipAddress: getRequestIP(event, { xForwardedFor: true }) ?? null,
            userAgent: getRequestHeader(event, 'user-agent') ?? null
        },
        config.auditLogRetentionDays
    );
}

/** The user in the route's `:id`, or a 404. */
export async function requireUser(context: AdminContext, userId: string | undefined) {
    const user = userId ? await context.internalAdapter.findUserById(userId) : null;
    if (!user)
        throw createError({ statusCode: 404, statusMessage: 'User not found', data: { code: 'USER_NOT_FOUND' } });
    return user;
}
