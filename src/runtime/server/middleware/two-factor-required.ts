import { createError, defineEventHandler, getHeader, getUserSession, serverAuth, useRuntimeConfig } from '#imports';

import { UI_API } from '../../constants';
import type { TwoFactorRequired } from '../../two-factor-required';
import { mustSetUpTwoFactor } from '../two-factor/passkey-sessions';

/** What the account page needs while two-factor is being set up. */
const ALLOWED = [`${UI_API}/capabilities`, `${UI_API}/two-factor`];

type Verifications = Parameters<typeof mustSetUpTwoFactor>[0];
type Session = Parameters<typeof mustSetUpTwoFactor>[1];

/**
 * Users who must have two-factor on can't use the app's API routes (or the admin's) until they've set it up, unless
 * they signed in with a passkey. Better Auth's own routes stay open: setting it up goes through them, and the module's
 * Better Auth plugin guards its admin endpoints. Only requests that can carry a session are looked at: a cookie, a
 * bearer token (the Bearer plugin) or an API key (with `enableSessionForAPIKeys`). The session lookup is the one the
 * request's own handlers reuse.
 */
export default defineEventHandler(async (event) => {
    const path = event.path.split('?')[0]!;
    if (!path.startsWith('/api/') || path.startsWith('/api/auth/') || ALLOWED.includes(path)) return;
    if (!['cookie', 'authorization', 'x-api-key'].some((name) => getHeader(event, name))) return;
    const { twoFactorRequired } = useRuntimeConfig(event).public.betterAuthUi as {
        twoFactorRequired: TwoFactorRequired;
    };
    const session = (await getUserSession(event)) as Session | null;
    if (!session) return;
    const { internalAdapter } = await (
        serverAuth(event) as unknown as { $context: Promise<{ internalAdapter: Verifications }> }
    ).$context;
    if (await mustSetUpTwoFactor(internalAdapter, session, twoFactorRequired)) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Set up two-factor authentication on your account first.',
            data: { code: 'TWO_FACTOR_SETUP_REQUIRED' }
        });
    }
});
