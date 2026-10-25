// The auth emails an app can send through the module, with what each template gets. The data is what Better
// Auth passes the matching option (https://better-auth.com/docs/concepts/email).

/** The user Better Auth passes to its email options. */
export type EmailUser = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    [field: string]: unknown;
};

export type BetterAuthEmails = {
    /** `emailVerification.sendVerificationEmail` */
    'verify-email': { user: EmailUser; url: string; token: string };
    /** `emailAndPassword.sendResetPassword` */
    'reset-password': { user: EmailUser; url: string; token: string };
    /** `emailAndPassword.onExistingUserSignUp`: someone tried to sign up with their email. */
    'existing-user-sign-up': { user: EmailUser };
    /** `user.changeEmail.sendChangeEmailConfirmation`: approve a change, sent to the current address. */
    'change-email-confirmation': { user: EmailUser; newEmail: string; url: string; token: string };
    /** `user.deleteUser.sendDeleteAccountVerification`: confirm deleting the account. */
    'delete-account': { user: EmailUser; url: string; token: string };
    /** Two-Factor plugin `otpOptions.sendOTP`: a sign-in code, when `betterAuthUi.twoFactor.otp` is on. */
    'two-factor-code': { user: EmailUser; otp: string };
    /** Magic Link plugin `sendMagicLink`, when `betterAuthUi.magicLink` is on. There may be no account yet. */
    'magic-link': { email: string; url: string; token: string };
    /**
     * Email OTP plugin `sendVerificationOTP`, when `betterAuthUi.emailOtp` is on. The pages ask for `sign-in` codes;
     * Better Auth's endpoints can also send the other kinds. There may be no account yet.
     */
    'email-code': {
        email: string;
        otp: string;
        type: 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';
    };
    // Security alerts (betterAuthUi.securityAlerts). `time` is formatted in the emails' language, in UTC; `accountUrl`
    // is the account page, where they can sign devices out and change their password.
    /** Someone signed in from a device the account hasn't used before. */
    'new-sign-in': { user: EmailUser; device: string; ipAddress: string | null; time: string; accountUrl: string };
    /** The password was changed, reset, or set by an admin. */
    'password-changed': { user: EmailUser; time: string; accountUrl: string };
    /** Two-factor was turned on or off (by them, or by an admin). */
    'two-factor-changed': { user: EmailUser; enabled: boolean; time: string; accountUrl: string };
    /** A passkey was added to the account. */
    'passkey-added': { user: EmailUser; name: string | null; time: string; accountUrl: string };
    /**
     * Organization plugin `sendInvitationEmail`, when `betterAuthUi.organization` is on: `url` opens the module's
     * invitation page. There may be no account yet.
     */
    'organization-invitation': {
        email: string;
        organization: string;
        inviter: { name: string; email: string };
        role: string;
        url: string;
    };
};

export type BetterAuthEmailName = keyof BetterAuthEmails;

/** Every email, in the order the docs and the admin's configuration page list them. */
export const EMAIL_NAMES: BetterAuthEmailName[] = [
    'verify-email',
    'reset-password',
    'existing-user-sign-up',
    'change-email-confirmation',
    'delete-account',
    'two-factor-code',
    'magic-link',
    'email-code',
    'new-sign-in',
    'password-changed',
    'two-factor-changed',
    'passkey-added',
    'organization-invitation'
];

/** What a template returns: an HTML body (with the default subject), or the parts it wants to set. */
export type RenderedEmail = string | { subject?: string; html?: string; text?: string };

export type BetterAuthEmailTemplate<Name extends BetterAuthEmailName> = {
    name: Name;
    render: (data: BetterAuthEmails[Name]) => RenderedEmail | Promise<RenderedEmail>;
};

/** The message the app's `send` function delivers. `text` is always set; `html` when a template gives one. */
export type EmailMessage = { to: string; subject: string; text: string; html?: string; email: BetterAuthEmailName };

export type EmailSender = (message: EmailMessage) => unknown | Promise<unknown>;
