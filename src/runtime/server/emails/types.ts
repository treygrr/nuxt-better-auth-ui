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
};

export type BetterAuthEmailName = keyof BetterAuthEmails;

/** What a template returns: an HTML body (with the default subject), or the parts it wants to set. */
export type RenderedEmail = string | { subject?: string; html?: string; text?: string };

export type BetterAuthEmailTemplate<Name extends BetterAuthEmailName> = {
    name: Name;
    render: (data: BetterAuthEmails[Name]) => RenderedEmail | Promise<RenderedEmail>;
};

/** The message the app's `send` function delivers. `text` is always set; `html` when a template gives one. */
export type EmailMessage = { to: string; subject: string; text: string; html?: string; email: BetterAuthEmailName };

export type EmailSender = (message: EmailMessage) => unknown | Promise<unknown>;
