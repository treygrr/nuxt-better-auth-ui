// A Better Auth plugin, loaded into the app's auth config, so no Nuxt or Nitro imports here.
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';

import { requiresTwoFactor, type TwoFactorRequired } from '../../two-factor-required';
import { mustSetUpTwoFactor, notePasskeySession } from './passkey-sessions';

/** Better Auth's verification table, through its internal adapter (as its own plugins use it). */
const verifications = (ctx: { context: { internalAdapter: unknown } }) =>
    ctx.context.internalAdapter as Parameters<typeof notePasskeySession>[0];

/**
 * Sign-ins that create a session without a password, which Better Auth's Two-Factor plugin doesn't challenge
 * (https://better-auth.com/docs/plugins/2fa#sign-in-with-2fa): social and Generic OAuth callbacks, social ID tokens,
 * magic links, email OTP, phone number codes and One Tap.
 */
const PASSWORDLESS_SIGN_INS = new Set([
    '/callback/:id',
    '/oauth2/callback/:providerId',
    '/sign-in/social',
    '/magic-link/verify',
    '/sign-in/email-otp',
    '/phone-number/verify',
    '/one-tap/callback'
]);

type User = { role?: string | null; twoFactorEnabled?: boolean | null };
type HookResult = { response?: unknown; headers?: Headers | null };
/** Better Auth's context for a request, as it hands it to plugin hooks. */
type HookContext = {
    path?: string;
    context: {
        baseURL: string;
        newSession?: { user: User } | null;
        responseHeaders?: Headers;
        getPlugin(id: 'two-factor'): {
            hooks?: {
                after?: Array<{
                    matcher(context: HookContext): boolean;
                    handler(context: HookContext): Promise<HookResult>;
                }>;
            };
        } | null;
    };
};
type Challenge = { twoFactorRedirect?: boolean; twoFactorMethods?: string[] };

export type TwoFactorEnforcementOptions = {
    /** Who must have two-factor on. */
    required: TwoFactorRequired;
    /** The page that takes the code, eg `/two-factor`; false: passwordless sign-ins aren't challenged. */
    page: string | false;
    /** The query parameter for where to go afterwards (@nuxtjs/better-auth's `redirectQueryKey`). */
    redirectQueryKey: string;
};

/**
 * Better Auth's Two-Factor plugin asks for a code after password sign-ins only. This asks for it after passwordless
 * sign-ins too, as its docs suggest ("add custom hook handling for those endpoints"), by running the plugin's own
 * challenge, so the code, trusted devices, lockout and cookies all work the same. And for `required` users it refuses
 * turning two-factor off, and Better Auth's admin endpoints until they've set it up, unless they signed in with a
 * passkey (complete on its own; a password sign-in still needs another factor).
 */
export const twoFactorEnforcement = ({ required, page, redirectQueryKey }: TwoFactorEnforcementOptions) =>
    ({
        id: 'better-auth-ui-two-factor',
        hooks: {
            before: [
                {
                    matcher: (ctx) => ctx.path === '/two-factor/disable',
                    handler: createAuthMiddleware(async (ctx) => {
                        const session = await getSessionFromCtx(ctx);
                        if (session && requiresTwoFactor(session.user as User, required)) {
                            throw new APIError('FORBIDDEN', {
                                message: 'Your account requires two-factor authentication, so it stays on.'
                            });
                        }
                    })
                },
                {
                    matcher: (ctx) => !!required && !!ctx.path?.startsWith('/admin/'),
                    handler: createAuthMiddleware(async (ctx) => {
                        const session = await getSessionFromCtx(ctx);
                        type Session = Parameters<typeof mustSetUpTwoFactor>[1];
                        if (session && (await mustSetUpTwoFactor(verifications(ctx), session as Session, required))) {
                            throw new APIError('FORBIDDEN', {
                                message: 'Set up two-factor authentication on your account first.'
                            });
                        }
                    })
                }
            ],
            after: [
                // Passkey sign-ins aren't asked for a code, and satisfy `required`: noted for this session.
                {
                    matcher: (ctx) => !!required && ctx.path === '/passkey/verify-authentication',
                    handler: createAuthMiddleware(async (ctx) => {
                        const session = ctx.context.newSession?.session;
                        if (session) await notePasskeySession(verifications(ctx), session);
                    })
                },
                {
                    matcher: (ctx) => !!page && !!ctx.path && PASSWORDLESS_SIGN_INS.has(ctx.path),
                    // Not wrapped in createAuthMiddleware: it passes Better Auth's own context on to the Two-Factor
                    // plugin's hook, as Better Auth itself calls hooks, and returns that hook's cookies.
                    handler: (async (ctx: HookContext): Promise<HookResult> => {
                        if (!ctx.context.newSession?.user.twoFactorEnabled) return {};
                        const challenge = ctx.context
                            .getPlugin('two-factor')
                            ?.hooks?.after?.find((hook) => hook.matcher({ ...ctx, path: '/sign-in/email' }));
                        if (!challenge) return {};

                        // Ends the new session and sets the plugin's two-factor cookie, unless the device is trusted.
                        const result = await challenge.handler(ctx);
                        const body = result.response as Challenge | undefined;
                        if (!body?.twoFactorRedirect) return { headers: result.headers };

                        // Callbacks redirect: to the code page instead, then on to where they were going.
                        const location = ctx.context.responseHeaders?.get('location');
                        if (!location) return result;
                        const destination = new URL(location, ctx.context.baseURL);
                        const sameSite = destination.origin === new URL(ctx.context.baseURL).origin;
                        const query = new URLSearchParams({
                            [redirectQueryKey]: sameSite
                                ? destination.pathname + destination.search + destination.hash
                                : destination.href,
                            methods: (body.twoFactorMethods ?? []).join(',')
                        });
                        const headers = new Headers(result.headers ?? undefined);
                        headers.set('location', `${page}?${query}`);
                        return { headers };
                    }) as never
                }
            ]
        }
    }) satisfies BetterAuthPlugin;
