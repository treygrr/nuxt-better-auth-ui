import type { MessageKey, MessageParams } from '../i18n';

// Better Auth's error codes as it adds them to an error URL (?error=…), from provider sign-ins and sign-in links, in
// plain words (https://better-auth.com/docs/reference/errors). The words are in the dictionaries, under `oauth.`.
const KNOWN = new Set([
    'email_not_found',
    'account_not_linked',
    'account_already_linked_to_different_user',
    "email_doesn't_match",
    'unable_to_link_account',
    'signup_disabled',
    'email_not_verified',
    'access_denied',
    // Sign-in links
    'INVALID_TOKEN',
    'EXPIRED_TOKEN',
    'new_user_signup_disabled',
    'failed_to_create_user',
    // Single sign-on (SSO plugin)
    'invalid_provider'
]);

/** A readable message for an error code, or a generic one naming it. */
export const oauthErrorMessage = (code: string, t: (key: MessageKey, params?: MessageParams) => string) =>
    KNOWN.has(code)
        ? t(`oauth.${code}` as MessageKey)
        : t('oauth.unknown', { code: code.replaceAll('_', ' ').toLowerCase() });
