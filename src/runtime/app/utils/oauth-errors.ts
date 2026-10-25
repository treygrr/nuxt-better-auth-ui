// Better Auth's OAuth error codes, as it adds them to the error URL (?error=…), in plain words.
// https://better-auth.com/docs/reference/errors
const MESSAGES: Record<string, string> = {
    email_not_found:
        "The provider didn't share an email address. Make one visible (eg on GitHub, a public or verified email), then try again.",
    account_not_linked:
        'That account uses an email that already has an account here. Sign in another way, then connect it from your account page.',
    account_already_linked_to_different_user: "That provider account is already connected to someone else's account.",
    "email_doesn't_match": "That provider account's email doesn't match yours.",
    unable_to_link_account: "Couldn't connect that account. Try again.",
    signup_disabled: "New accounts can't be created with that provider.",
    email_not_verified: "Verify your email first: we've sent you a link.",
    access_denied: 'Sign-in was cancelled.'
};

/** A readable message for an OAuth error code, or a generic one. */
export const oauthErrorMessage = (code: string) =>
    MESSAGES[code] ?? `Couldn't sign you in with that provider (${code.replaceAll('_', ' ')}). Try again.`;
