// A Better Auth plugin, loaded into the app's auth config, so no Nuxt or Nitro imports here.
import { createAuthMiddleware, getSessionFromCtx, isAPIError } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';

import { device } from '../../app/utils/device';
import { emailLocale, sendAuthEmail } from '../emails/index';
import type { EmailUser } from '../emails/types';

/** Which security alerts the module emails (betterAuthUi.securityAlerts). */
export type SecurityAlerts = {
    /** A sign-in from a device the account hasn't used before. */
    newSignIn: boolean;
    /** The password was changed, reset, or set by an admin. */
    passwordChanged: boolean;
    /** Two-factor was turned on or off. */
    twoFactor: boolean;
    /** A passkey was added. */
    passkeyAdded: boolean;
};

type Options = SecurityAlerts & { /** The account page, linked from every alert. */ accountPath: string | false };

type Session = {
    id: string;
    userId: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    impersonatedBy?: string | null;
};
type Context = {
    baseURL: string;
    internalAdapter: {
        findUserById(id: string): Promise<(EmailUser & { createdAt: Date; twoFactorEnabled?: boolean | null }) | null>;
        listSessions(userId: string): Promise<Session[]>;
    };
    adapter: {
        findMany<T>(query: {
            model: string;
            where: Array<{ field: string; value: unknown; connector?: 'AND' | 'OR' }>;
            limit?: number;
        }): Promise<T[]>;
    };
    logger: { error(message: string, ...args: unknown[]): void };
};
/** What Better Auth hands database hooks: the request's context, when there is a request. */
type HookContext = { path?: string; context: Context } | null | undefined;

/** Sign-ins Better Auth (or the module's two-factor plugin) follows with a code when the user has two-factor on. */
const CHALLENGED = [
    '/sign-in/email',
    '/sign-in/username',
    '/sign-in/phone-number',
    '/callback/:id',
    '/oauth2/callback/:providerId',
    '/sign-in/social',
    '/magic-link/verify',
    '/sign-in/email-otp',
    '/phone-number/verify',
    '/one-tap/callback'
];
const PASSWORD_PATHS = ['/change-password', '/reset-password', '/set-password', '/admin/set-user-password'];
const TWO_FACTOR_ON = ['/two-factor/enable', '/two-factor/verify-totp'];

/** A guest account (Better Auth's Anonymous plugin), whose generated address reaches nobody. */
const isGuest = (user: object) => (user as { isAnonymous?: boolean | null }).isAnonymous === true;

/** "Chrome on Windows", with the connecting word in the emails' language. */
const deviceName = (userAgent: string | null | undefined, locale: string) =>
    device(userAgent, (key, params) =>
        key === 'admin.device.on'
            ? `${params!.browser} ${locale === 'es' ? 'en' : 'on'} ${params!.os}`
            : key === 'admin.device.unknown'
              ? locale === 'es'
                  ? 'un dispositivo desconocido'
                  : 'an unknown device'
              : locale === 'es'
                ? 'Navegador'
                : 'Browser'
    );

/**
 * Emails the account's owner when something security-sensitive happens to it: a sign-in from a new device, a password
 * change, two-factor turned on or off, a passkey added. Through the module's emails (templates, languages), sent in
 * the background. Better Auth's database hooks see each change whichever endpoint made it; a plugin adds them through
 * `init`, as Better Auth's own plugins do.
 */
export const securityAlerts = (options: Options) => {
    const accountUrl = (context: Context, tab: string) =>
        options.accountPath ? new URL(`${options.accountPath}?tab=${tab}`, new URL(context.baseURL).origin).href : '';
    const time = async () => {
        const locale = await emailLocale();
        const formatted = new Intl.DateTimeFormat(locale, {
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'UTC'
        }).format(new Date());
        return `${formatted} UTC`;
    };
    /** Devices the account has signed in from: its other sessions, and (with the audit log) recorded sign-ins. */
    async function knownDevices(context: Context, session: Session) {
        const sessions = await context.internalAdapter.listSessions(session.userId);
        const agents = sessions.filter((other) => other.id !== session.id).map((other) => other.userAgent);
        try {
            const signIns = await context.adapter.findMany<{ userAgent: string | null }>({
                model: 'adminAuditLog',
                where: [
                    { field: 'actorId', value: session.userId },
                    { field: 'action', value: 'auth.sign-in', connector: 'AND' }
                ],
                limit: 100
            });
            agents.push(...signIns.map((entry) => entry.userAgent));
        } catch {
            // No audit log (admin.auditLog off): sessions only.
        }
        return new Set(agents.map((agent) => deviceName(agent, 'en')));
    }

    return {
        id: 'better-auth-ui-security-alerts',
        // Typed loosely: the hooks below describe just the fields they read.
        init: (() => {
            return {
                options: {
                    databaseHooks: {
                        session: {
                            create: {
                                async after(session: Session, ctx: HookContext) {
                                    if (!options.newSignIn || !ctx?.path || session.impersonatedBy) return;
                                    const context = ctx.context;
                                    const user = await context.internalAdapter.findUserById(session.userId);
                                    // A brand-new account isn't news, and a sign-in that's about to be asked for a code
                                    // alerts when the code completes it (from /two-factor/verify-*), not twice.
                                    if (!user || isGuest(user)) return;
                                    if (Date.now() - new Date(user.createdAt).getTime() < 120_000) return;
                                    if (user.twoFactorEnabled && CHALLENGED.includes(ctx.path)) return;
                                    if (
                                        (await knownDevices(context, session)).has(deviceName(session.userAgent, 'en'))
                                    ) {
                                        return;
                                    }
                                    const locale = await emailLocale();
                                    sendAuthEmail('new-sign-in', {
                                        user,
                                        device: deviceName(session.userAgent, locale),
                                        ipAddress: session.ipAddress ?? null,
                                        time: await time(),
                                        accountUrl: accountUrl(context, 'devices')
                                    });
                                }
                            }
                        },
                        account: {
                            update: { after: passwordChanged },
                            // Setting a first password (eg a social-only account's reset link) creates the account.
                            create: { after: passwordChanged }
                        },
                        user: {
                            update: {
                                async after(user: EmailUser & { twoFactorEnabled?: boolean | null }, ctx: HookContext) {
                                    if (!options.twoFactor || !ctx?.path || isGuest(user)) return;
                                    const turnedOff = ctx.path === '/two-factor/disable' && !user.twoFactorEnabled;
                                    const turnedOn = TWO_FACTOR_ON.includes(ctx.path) && !!user.twoFactorEnabled;
                                    if (!turnedOff && !turnedOn) return;
                                    sendAuthEmail('two-factor-changed', {
                                        user,
                                        enabled: turnedOn,
                                        time: await time(),
                                        accountUrl: accountUrl(ctx.context, 'security')
                                    });
                                }
                            }
                        }
                    }
                }
            };
        }) as never,
        hooks: {
            after: [
                {
                    matcher: (ctx) => options.passkeyAdded && ctx.path === '/passkey/verify-registration',
                    handler: createAuthMiddleware(async (ctx) => {
                        const returned = ctx.context.returned;
                        if (isAPIError(returned)) return;
                        const session = await getSessionFromCtx(ctx);
                        if (!session || isGuest(session.user)) return;
                        sendAuthEmail('passkey-added', {
                            user: session.user as EmailUser,
                            name: (returned as { name?: string | null } | undefined)?.name ?? null,
                            time: await time(),
                            accountUrl: accountUrl(ctx.context as unknown as Context, 'security')
                        });
                    })
                }
            ]
        }
    } satisfies BetterAuthPlugin;

    async function passwordChanged(account: { userId: string; providerId: string }, ctx: HookContext) {
        if (!options.passwordChanged || !ctx?.path || !PASSWORD_PATHS.includes(ctx.path)) return;
        if (account.providerId !== 'credential') return;
        const user = await ctx.context.internalAdapter.findUserById(account.userId);
        if (!user || isGuest(user)) return;
        sendAuthEmail('password-changed', {
            user,
            time: await time(),
            accountUrl: accountUrl(ctx.context, 'security')
        });
    }
};

/** Emails two-factor's owner that it was turned off by an admin (the module's reset, which has no request context). */
export async function alertTwoFactorReset(user: EmailUser, baseURL: string, accountPath: string | false) {
    if (isGuest(user)) return;
    const locale = await emailLocale();
    sendAuthEmail('two-factor-changed', {
        user,
        enabled: false,
        time: `${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(new Date())} UTC`,
        accountUrl: accountPath ? new URL(`${accountPath}?tab=security`, new URL(baseURL).origin).href : ''
    });
}
