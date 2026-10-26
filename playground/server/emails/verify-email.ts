import { defineBetterAuthEmail } from '@treygrr/nuxt-better-auth-ui/emails';

/** Names are what people typed at sign-up: escaped, like anything else put into HTML. */
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

// An HTML template for the verification email. The reset email has no template, so it's the plain-text default.
export default defineBetterAuthEmail('verify-email', async ({ user, url }) => ({
    subject: 'Welcome to the playground: verify your email',
    html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px">
            <h1 style="font-size: 20px">Hi ${escapeHtml(user.name)}, welcome!</h1>
            <p>Confirm this is your email address to finish setting up your account.</p>
            <p><a href="${url}" style="background: #00c16a; color: #fff; padding: 10px 16px; border-radius: 6px; text-decoration: none">Verify email</a></p>
        </div>
    `
}));
