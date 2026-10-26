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

/** An audit entry's details, stored as JSON text: parsed, or the text itself when it isn't JSON. */
export function parseDetails(details: unknown) {
    if (typeof details !== 'string') return details ?? null;
    try {
        return JSON.parse(details);
    } catch {
        return details;
    }
}

async function prune(context: { adapter: Adapter; logger: Logger }, retentionDays: number) {
    const cutoff = retentionCutoff(retentionDays);
    if (!cutoff) return;
    try {
        await context.adapter.deleteMany({
            model: AUDIT_MODEL,
            where: [{ field: 'createdAt', operator: 'lt', value: cutoff }]
        });
    } catch (error) {
        context.logger.error('[better-auth-ui] Could not prune the audit log.', error);
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
        context.logger.error('[better-auth-ui] Could not write to the audit log. Have migrations run?', error);
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

/** How someone signed in, from the endpoint that created their session. */
function signInMethod(path: string, body: Body) {
    if (path.startsWith('/callback/')) return path.slice('/callback/'.length);
    if (path === '/sign-in/social' && typeof body.provider === 'string') return body.provider;
    if (path === '/verify-email') return 'verification link';
    if (path === '/device/token') return 'device';
    if (path === '/phone-number/verify') return 'phone';
    const [, kind, method] = path.split('/');
    return kind === 'sign-in' || kind === 'sign-up' ? method : path;
}

type Background = { runInBackground?: (task: Promise<unknown>) => void };
/** Runs a task after the response, where Better Auth supports it, so lookups can't reveal anything by timing. */
const inBackground = (context: Background, task: () => Promise<unknown>) =>
    context.runInBackground ? context.runInBackground(task()) : void task();

/** What the before hook learns, while the session and the user still exist. */
type Pending = { actor: AuditPerson; target: AuditPerson | null };

/**
 * Records the Admin plugin's successful actions in the `adminAuditLog` table: who, what, to whom, when and
 * from where, for `retentionDays` (0 keeps them forever). With `userEvents`, users' own sign-ins and account
 * changes too. Reads the actor and target before the action (a
 * deleted user, an ended impersonation), writes after it, only when it succeeded.
 */
export const adminAuditLog = ({
    retentionDays = DEFAULT_RETENTION_DAYS,
    userEvents = true
}: {
    retentionDays?: number;
    /** Also record sign-ins, failed sign-ins, sign-outs, password resets and changes, and email verification. */
    userEvents?: boolean;
} = {}) => {
    return {
        id: 'better-auth-ui-audit-log',
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
                        return { context: { betterAuthUiAudit: { actor, target } satisfies Pending } };
                    })
                },
                // Sign-outs, recorded before the session is gone.
                {
                    matcher: (ctx) => userEvents && ctx.path === '/sign-out',
                    handler: createAuthMiddleware(async (ctx) => {
                        const session = await getSessionFromCtx(ctx);
                        if (!session) return;
                        const user = person(session.user as AuditPerson)!;
                        await writeUserEvent(ctx, 'auth.sign-out', user);
                    })
                }
            ],
            after: [
                {
                    matcher: (ctx) => !!ctx.path && ctx.path in ACTIONS,
                    handler: createAuthMiddleware(async (ctx) => {
                        const pending = (ctx as unknown as { betterAuthUiAudit?: Pending }).betterAuthUiAudit;
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
                },
                {
                    matcher: (ctx) => userEvents && !!ctx.path && !(ctx.path in ACTIONS),
                    handler: createAuthMiddleware(async (ctx) => {
                        const path = ctx.path!;
                        const body = (ctx.body ?? {}) as Body;
                        const failed = isAPIError(ctx.context.returned);
                        const internal = ctx.context.internalAdapter as unknown as InternalAdapter & {
                            findUserByEmail(email: string): Promise<{ user: AuditPerson } | null>;
                        };

                        // Any endpoint that created a session signed someone in: email, social, verification…
                        const newSession = ctx.context.newSession as { user: AuditPerson } | null | undefined;
                        if (newSession && !failed) {
                            const user = person(newSession.user)!;
                            if (path === '/verify-email') await writeUserEvent(ctx, 'auth.email-verified', user);
                            await writeUserEvent(
                                ctx,
                                path.startsWith('/sign-up') ? 'auth.sign-up' : 'auth.sign-in',
                                user,
                                {
                                    method: signInMethod(path, body)
                                }
                            );
                            return;
                        }
                        if (path === '/change-password' && !failed) {
                            const session = await getSessionFromCtx(ctx);
                            if (session)
                                await writeUserEvent(
                                    ctx,
                                    'auth.password-changed',
                                    person(session.user as AuditPerson)!
                                );
                            return;
                        }
                        // Device Authorization: the user let a device (a TV, a CLI) sign in to their account. API Key:
                        // they deleted one of their keys (the module's create route records creating them).
                        const OWN_ACTIONS: Record<string, string> = {
                            '/device/approve': 'auth.device-approved',
                            '/api-key/delete': 'auth.api-key-deleted'
                        };
                        if (path in OWN_ACTIONS && !failed) {
                            const session = await getSessionFromCtx(ctx);
                            if (session)
                                await writeUserEvent(ctx, OWN_ACTIONS[path]!, person(session.user as AuditPerson)!);
                            return;
                        }
                        // These look the account up by email: in the background, so the response time is the same
                        // whether it exists. Emails without an account aren't recorded.
                        const byEmail = (action: string, details?: Record<string, unknown>) =>
                            inBackground(ctx.context as unknown as Background, async () => {
                                if (typeof body.email !== 'string') return;
                                const found = await internal.findUserByEmail(body.email.toLowerCase());
                                if (found) await writeUserEvent(ctx, action, person(found.user)!, details);
                            });
                        if (path === '/sign-in/email' && failed) {
                            const error = ctx.context.returned as { message?: string; body?: { code?: string } };
                            byEmail('auth.sign-in-failed', { reason: error.body?.code ?? error.message ?? null });
                        } else if (path === '/request-password-reset' && !failed) {
                            byEmail('auth.password-reset-requested');
                        }
                    })
                }
            ]
        }
    } satisfies BetterAuthPlugin;

    /** A user's own action: they're both who did it and who it's about. */
    async function writeUserEvent(
        ctx: { context: unknown; headers?: Headers },
        action: string,
        user: AuditPerson,
        details?: Record<string, unknown>
    ) {
        const context = ctx.context as { adapter: Adapter; logger: Logger; options: Parameters<typeof getIP>[1] };
        await writeAuditEntry(
            context,
            {
                action,
                actor: user,
                target: user,
                details: details ?? null,
                ipAddress: ctx.headers ? getIP(ctx.headers, context.options) : null,
                userAgent: ctx.headers?.get('user-agent') ?? null
            },
            retentionDays
        );
    }
};
