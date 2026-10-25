// Public entry, `@treygrr/nuxt-better-auth-ui/providers`: Generic OAuth configs for providers Better Auth has no helper
// for, written like its own (better-auth/plugins/generic-oauth). No Nuxt or Nitro imports: they're for the app's auth
// config, which also loads at build time.
import type { GenericOAuthConfig, GenericOAuthUserInfo } from 'better-auth/plugins/generic-oauth';

/**
 * The domain of the placeholder email for providers that don't share one. It's reserved (`.invalid`, RFC 2606), so
 * the module never emails it, and accounts with it are asked for a real email (the "finish your account" page).
 */
export const NO_EMAIL_DOMAIN = 'no-email.invalid';

/** A placeholder email for an account from a provider without one: unique per provider and account. */
export const placeholderEmail = (providerId: string, accountId: string) =>
    `${accountId.toLowerCase().replace(/[^a-z0-9._-]/g, '-')}.${providerId}@${NO_EMAIL_DOMAIN}`;

/** Whether an email is such a placeholder: the account still needs a real one. */
export const isPlaceholderEmail = (email: string | null | undefined) =>
    !!email && email.toLowerCase().endsWith(`@${NO_EMAIL_DOMAIN}`);

type HelperOptions = Pick<
    GenericOAuthConfig,
    | 'clientId'
    | 'clientSecret'
    | 'scopes'
    | 'redirectURI'
    | 'disableSignUp'
    | 'disableImplicitSignUp'
    | 'overrideUserInfo'
>;

/** The provider's userinfo, with the access token. Null when it fails: Better Auth then refuses the sign-in. */
async function userInfo<T>(url: string, accessToken: string | undefined) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    return response.ok ? ((await response.json()) as T) : null;
}

/**
 * Epic Games (Epic Account Services, OpenID Connect). Epic doesn't share email addresses, so accounts get a placeholder
 * email and are asked for a real one; the name is their Epic display name. Register
 * `https://your-site/api/auth/callback/epic-games` as the redirect URL.
 *
 * ```ts
 * genericOAuth({ config: [epicGames({ clientId: process.env.EPIC_CLIENT_ID!, clientSecret: process.env.EPIC_CLIENT_SECRET! })] })
 * ```
 */
export function epicGames(options: HelperOptions): GenericOAuthConfig<'epic-games'> {
    return {
        ...options,
        providerId: 'epic-games',
        discoveryUrl: 'https://api.epicgames.dev/epic/oauth/v2/.well-known/openid-configuration',
        scopes: options.scopes ?? ['openid', 'basic_profile'],
        getUserInfo: async (tokens): Promise<GenericOAuthUserInfo | null> => {
            const profile = await userInfo<{ sub: string; preferred_username?: string }>(
                'https://api.epicgames.dev/epic/oauth/v2/userInfo',
                tokens.accessToken
            );
            if (!profile?.sub) return null;
            return {
                id: profile.sub,
                name: profile.preferred_username ?? 'Epic Games player',
                email: placeholderEmail('epic-games', profile.sub),
                emailVerified: false
            };
        }
    };
}

/**
 * Battle.net (Blizzard, OpenID Connect). Battle.net doesn't share email addresses either: accounts get a placeholder
 * email and are asked for a real one; the name is their BattleTag. `region: 'cn'` uses Blizzard's China servers.
 * Register `https://your-site/api/auth/callback/battle-net` as the redirect URL.
 */
export function battleNet(options: HelperOptions & { region?: 'global' | 'cn' }): GenericOAuthConfig<'battle-net'> {
    const { region, ...rest } = options;
    const host = region === 'cn' ? 'https://oauth.battlenet.com.cn' : 'https://oauth.battle.net';
    return {
        ...rest,
        providerId: 'battle-net',
        discoveryUrl: `${host}/.well-known/openid-configuration`,
        scopes: rest.scopes ?? ['openid'],
        getUserInfo: async (tokens): Promise<GenericOAuthUserInfo | null> => {
            const profile = await userInfo<{ sub: string; battletag?: string }>(`${host}/userinfo`, tokens.accessToken);
            if (!profile?.sub) return null;
            return {
                id: profile.sub,
                name: profile.battletag ?? 'Battle.net player',
                email: placeholderEmail('battle-net', profile.sub),
                emailVerified: false
            };
        }
    };
}
