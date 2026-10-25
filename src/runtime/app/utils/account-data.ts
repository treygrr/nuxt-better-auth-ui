import { useFetch } from '#imports';

import { UI_API } from '../../constants';
import type { TwoFactorStatus } from '../../server/api/two-factor.get';
import type { Passkey } from './passkey';

/**
 * The signed-in user's data for the account page, each fetched once during server rendering under a fixed key, so
 * the overview and the cards share it: when a card refreshes it, the overview updates too.
 */

/** A sign-in method, as Better Auth's list-accounts returns it. */
export type AccountMethod = { id: string; providerId: string; createdAt: string };

/** A session, as Better Auth's list-sessions returns it. */
export type AccountSession = {
    id: string;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    updatedAt: string;
    createdAt: string;
};

export const useAccountMethods = () =>
    useFetch<AccountMethod[]>('/api/auth/list-accounts', { key: 'better-auth-ui-account-accounts', default: () => [] });

export const useAccountSessions = () =>
    useFetch<AccountSession[]>('/api/auth/list-sessions', {
        key: 'better-auth-ui-account-sessions',
        default: () => []
    });

/** Only when the app uses the Two-Factor plugin. */
export const useAccountTwoFactor = () =>
    useFetch<TwoFactorStatus>(`${UI_API}/two-factor`, { key: 'better-auth-ui-account-two-factor' });

/** Only when the app uses the Passkey plugin: its endpoint doesn't exist otherwise. */
export const useAccountPasskeys = () =>
    useFetch<Passkey[]>('/api/auth/passkey/list-user-passkeys', {
        key: 'better-auth-ui-account-passkeys',
        default: () => []
    });
