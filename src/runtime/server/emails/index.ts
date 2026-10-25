// Public entry, `@treygrr/nuxt-better-auth-ui/emails`, for the app's auth config and email templates.
// No Nuxt or Nitro imports: Better Auth's Nuxt module also loads the auth config at build time.
import { defaultEmails } from './defaults';
import type {
    BetterAuthEmailName,
    BetterAuthEmails,
    BetterAuthEmailTemplate,
    EmailMessage,
    EmailSender,
    RenderedEmail
} from './types';

export type * from './types';

/**
 * Declares an email template, typed by the email's name:
 *
 * ```ts
 * export default defineBetterAuthEmail('verify-email', async ({ user, url }) => `<a href="${url}">Verify</a>`)
 * ```
 *
 * Return an HTML string (sent with the default subject and plain-text version), or `{ subject, html, text }`.
 */
export function defineBetterAuthEmail<Name extends BetterAuthEmailName>(
    name: Name,
    render: (data: BetterAuthEmails[Name]) => RenderedEmail | Promise<RenderedEmail>
): BetterAuthEmailTemplate<Name> {
    return { name, render };
}

/** Declares the function that delivers emails (Resend, SMTP, …). */
export const defineBetterAuthEmailSender = (send: EmailSender): EmailSender => send;

type EmailConfig = {
    send?: EmailSender;
    templates: { [Name in BetterAuthEmailName]?: BetterAuthEmailTemplate<Name> };
};

/** Renders an email: the app's template if it has one, otherwise the plain-text default. */
export async function renderEmail<Name extends BetterAuthEmailName>(
    name: Name,
    data: BetterAuthEmails[Name],
    template?: BetterAuthEmailTemplate<Name>
): Promise<Omit<EmailMessage, 'to' | 'email'>> {
    const fallback = defaultEmails[name](data);
    if (!template) return fallback;
    if (template.name !== name) {
        throw new Error(`[better-auth-ui] The template for "${name}" is declared as "${template.name}"`);
    }
    const rendered = await template.render(data);
    if (typeof rendered === 'string') return { ...fallback, html: rendered };
    return { subject: rendered.subject ?? fallback.subject, text: rendered.text ?? fallback.text, html: rendered.html };
}

async function deliver<Name extends BetterAuthEmailName>(
    name: Name,
    data: BetterAuthEmails[Name] & { user: { email: string } }
) {
    // Loaded here, not at the top: the config only exists inside the built server.
    const { emailConfig } = (await import('#better-auth-ui/email-config')) as { emailConfig: EmailConfig };
    if (!emailConfig.send) {
        throw new Error('[better-auth-ui] No email sender: set betterAuthUi.emails.send to a file exporting one');
    }
    const message = await renderEmail(
        name,
        data,
        emailConfig.templates[name] as BetterAuthEmailTemplate<Name> | undefined
    );
    await emailConfig.send({ ...message, to: data.user.email, email: name });
}

/**
 * Sends an email without waiting for it, as Better Auth's docs advise (waiting would reveal through timing
 * which emails have accounts). Failures are logged.
 */
function sendInBackground<Name extends BetterAuthEmailName>(
    name: Name,
    data: BetterAuthEmails[Name] & { user: { email: string } }
) {
    deliver(name, data).catch((error) => console.error(`[better-auth-ui] Couldn't send the "${name}" email`, error));
}

/**
 * Ready-made Better Auth email options, for the app's auth config:
 *
 * ```ts
 * emailVerification: { sendVerificationEmail: betterAuthEmails.verifyEmail },
 * emailAndPassword: { sendResetPassword: betterAuthEmails.resetPassword }
 * ```
 */
export const betterAuthEmails = {
    verifyEmail: async (data: BetterAuthEmails['verify-email']) => sendInBackground('verify-email', data),
    resetPassword: async (data: BetterAuthEmails['reset-password']) => sendInBackground('reset-password', data),
    existingUserSignUp: async (data: BetterAuthEmails['existing-user-sign-up']) =>
        sendInBackground('existing-user-sign-up', data)
};
