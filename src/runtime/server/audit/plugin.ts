// A Better Auth plugin, loaded into the app's auth config, so no Nuxt or Nitro imports here.
import { createAuthMiddleware, getIP, getSessionFromCtx, isAPIError } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';

/** Better Auth's table for the audit log, created by its migrations alongside its own. */
export const AUDIT_MODEL = 'adminAuditLog';

/** Who did it, and to whom, as they were at the time: accounts can be renamed or deleted later. */
export type AuditPerson = { id: string; email: string; name: string };

export type AuditEntry = {
    action: string;
    actor: AuditPerson;
    target?: AuditPerson | null;
    details?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
};

type Adapter = {
    create(input: { model: string; data: Record<string, unknown> }): Promise<unknown>;
    deleteMany(input: {
        model: string;
        where: Array<{ field: string; operator?: string; value: unknown }>;
    }): Promise<unknown>;
};
type Logger = { error(message: string, ...args: unknown[]): void };
type InternalAdapter = {
    findUserById(id: string): Promise<AuditPerson | null>;
    findSession(token: string): Promise<{ user: AuditPerson } | null>;
};

const person = (user: AuditPerson | null | undefined): AuditPerson | null =>
    user ? { id: user.id, email: user.email, name: user.name } : null;

/** The default retention: entries older than this many days are deleted. 0 keeps them forever. */
export const DEFAULT_RETENTION_DAYS = 30;

/** The oldest entry to keep, or null to keep everything. */
export const retentionCutoff = (retentionDays: number) =>
    retentionDays > 0 ? new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000) : null;

async function prune(context: { adapter: Adapter; logger: Logger }, retentionDays: number) {
    const cutoff = retentionCutoff(retentionDays);
    if (!cutoff) return;
    try {
        await context.adapter.deleteMany({
            model: AUDIT_MODEL,
            where: [{ field: 'createdAt', operator: 'lt', value: cutoff }]
        });
    } catch (error) {
        context.logger.error('[better-auth-admin] Could not prune the audit log.', error);
    }
}

/**
 * Writes an entry, then deletes entries older than `retentionDays`: admin actions are rare, and `createdAt` is
 * indexed, so this is cheap. A failure is logged, never thrown, so a missing table (migrations not run yet)
 * can't break the admin action it records.
 */
export async function writeAuditEntry(
    context: { adapter: Adapter; logger: Logger },
    entry: AuditEntry,
    retentionDays = DEFAULT_RETENTION_DAYS
) {
    try {
        await context.adapter.create({
            model: AUDIT_MODEL,
            data: {
                action: entry.action,
                actorId: entry.actor.id,
                actorEmail: entry.actor.email,
                actorName: entry.actor.name,
                targetId: entry.target?.id ?? null,
                targetEmail: entry.target?.email ?? null,
                targetName: entry.target?.name ?? null,
                details: entry.details ? JSON.stringify(entry.details) : null,
                ipAddress: entry.ipAddress ?? null,
                userAgent: entry.userAgent ?? null,
                createdAt: new Date()
            }
        });
    } catch (error) {
        context.logger.error('[better-auth-admin] Could not write to the audit log. Have migrations run?', error);
        return;
    }
    await prune(context, retentionDays);
}

type Body = Record<string, unknown>;
/** The Admin plugin's endpoints that change something, and what to record about each. */
const ACTIONS: Record<string, { action: string; details?: (body: Body) => Record<string, unknown> }> = {
    '/admin/create-user': { action: 'user.create', details: (body) => ({ role: body.role ?? 'user' }) },
    '/admin/update-user': {
        action: 'user.update',
        details: (body) => ({ fields: Object.keys((body.data as Body | undefined) ?? {}) })
    },
    '/admin/set-role': { action: 'user.set-role', details: (body) => ({ role: body.role }) },
    '/admin/ban-user': {
        action: 'user.ban',
        details: (body) => ({ reason: body.banReason ?? null, expiresIn: body.banExpiresIn ?? null })
    },
    '/admin/unban-user': { action: 'user.unban' },
    '/admin/set-user-password': { action: 'user.set-password' },
    '/admin/remove-user': { action: 'user.delete' },
    '/admin/revoke-user-session': { action: 'session.revoke' },
    '/admin/revoke-user-sessions': { action: 'session.revoke-all' },
    '/admin/impersonate-user': { action: 'user.impersonate' },
    '/admin/stop-impersonating': { action: 'user.stop-impersonating' }
};

/** What the before hook learns, while the session and the user still exist. */
type Pending = { actor: AuditPerson; target: AuditPerson | null };

/**
 * Records the Admin plugin's successful actions in the `adminAuditLog` table: who, what, to whom, when and
 * from where, for `retentionDays` (0 keeps them forever). Reads the actor and target before the action (a
 * deleted user, an ended impersonation), writes after it, only when it succeeded.
 */
export const adminAuditLog = ({ retentionDays = DEFAULT_RETENTION_DAYS }: { retentionDays?: number } = {}) =>
    ({
        id: 'better-auth-admin-audit-log',
        schema: {
            [AUDIT_MODEL]: {
                fields: {
                    action: { type: 'string', required: true },
                    actorId: { type: 'string', required: true, index: true },
                    actorEmail: { type: 'string', required: true },
                    actorName: { type: 'string', required: true },
                    targetId: { type: 'string', required: false, index: true },
                    targetEmail: { type: 'string', required: false },
                    targetName: { type: 'string', required: false },
                    details: { type: 'string', required: false },
                    ipAddress: { type: 'string', required: false },
                    userAgent: { type: 'string', required: false },
                    createdAt: { type: 'date', required: true, index: true }
                }
            }
        },
        hooks: {
            before: [
                {
                    matcher: (ctx) => !!ctx.path && ctx.path in ACTIONS,
                    handler: createAuthMiddleware(async (ctx) => {
                        const session = await getSessionFromCtx(ctx);
                        if (!session) return;
                        const internal = ctx.context.internalAdapter as unknown as InternalAdapter;
                        const body = (ctx.body ?? {}) as Body;

                        let actor = person(session.user as AuditPerson);
                        let target: AuditPerson | null = null;
                        if (ctx.path === '/admin/stop-impersonating') {
                            // The admin is whoever started it; the session's user is who they were signed in as.
                            const impersonatedBy = (session.session as { impersonatedBy?: string }).impersonatedBy;
                            actor = impersonatedBy ? person(await internal.findUserById(impersonatedBy)) : null;
                            target = person(session.user as AuditPerson);
                        } else if (typeof body.userId === 'string') {
                            target = person(await internal.findUserById(body.userId));
                        } else if (typeof body.sessionToken === 'string') {
                            target = person((await internal.findSession(body.sessionToken))?.user);
                        }
                        if (!actor) return;
                        return { context: { betterAuthAdminAudit: { actor, target } satisfies Pending } };
                    })
                }
            ],
            after: [
                {
                    matcher: (ctx) => !!ctx.path && ctx.path in ACTIONS,
                    handler: createAuthMiddleware(async (ctx) => {
                        const pending = (ctx as unknown as { betterAuthAdminAudit?: Pending }).betterAuthAdminAudit;
                        const returned = ctx.context.returned;
                        if (!pending || isAPIError(returned)) return;
                        const { action, details } = ACTIONS[ctx.path!]!;
                        const body = (ctx.body ?? {}) as Body;
                        // A created user only exists afterwards.
                        const target = pending.target ?? person((returned as { user?: AuditPerson } | undefined)?.user);
                        await writeAuditEntry(
                            ctx.context as unknown as { adapter: Adapter; logger: Logger },
                            {
                                action,
                                actor: pending.actor,
                                target,
                                details: details?.(body) ?? null,
                                // Better Auth's own IP lookup, which follows the app's advanced.ipAddress settings.
                                ipAddress: ctx.headers ? getIP(ctx.headers, ctx.context.options) : null,
                                userAgent: ctx.headers?.get('user-agent') ?? null
                            },
                            retentionDays
                        );
                    })
                }
            ]
        }
    }) satisfies BetterAuthPlugin;
