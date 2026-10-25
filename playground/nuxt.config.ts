export default defineNuxtConfig({
    // Installs @nuxt/ui and @nuxtjs/better-auth itself, through its module dependencies.
    modules: ['@treygrr/nuxt-better-auth-ui'],
    betterAuthUi: {
        admin: {
            // Sign in as a user from their page; the banner in app.vue offers the way back.
            impersonation: true,
            // Opt-in "last active" and "online now"; a short interval to see it work.
            activityTracking: { enabled: true, updateInterval: 60_000 },
            // Private staff notes on each user's page.
            notes: true,
            // A role with some of the admin's permissions: it sees only those actions in the admin pages.
            roles: {
                moderator: { user: ['list', 'get', 'update', 'ban'], session: ['list', 'revoke'] }
            }
        },
        // Two-factor from the account page: an authenticator app, or codes by email (to the outbox).
        // Passkeys: added from the account page, signed in with on the sign-in page.
        passkey: { enabled: true, rpName: 'Better Auth UI playground' },
        // Moderators must have it on.
        twoFactor: { enabled: true, otp: true, issuer: 'Better Auth UI playground', required: ['moderator'] },
        // Usernames at sign-up and on the account page; sign-in links by email (to the outbox); "last used" on sign-in.
        username: { enabled: true },
        magicLink: { enabled: true },
        // "Email me a code" on sign-in, to the outbox.
        emailOtp: { enabled: true },
        // "Continue as a guest" on sign-in; guests keep their account by signing up or in.
        anonymous: { enabled: true, onLinkAccount: './server/auth/link-guest.ts' },
        // Signing in a TV app or CLI with a code, approved at /device.
        deviceAuthorization: { enabled: true, clients: { 'playground-tv': 'Playground TV' } },
        // An "API keys" tab on the account page, with two permissions to pick from.
        apiKey: { enabled: true, prefix: 'pg_', scopes: { projects: ['read', 'write'] } },
        // "Text me a code" on sign-in (a new number signs up) and a phone card on the account page; texts to the outbox.
        phoneNumber: { enabled: true, signUp: true },
        sms: { send: './server/sms/send.ts' },
        // An "Organizations" tab on the account page, invitations by email (to the outbox), admin organization pages.
        organization: { enabled: true },
        // Session tokens in an Authorization header, and JWTs verified with /api/auth/jwks.
        bearer: true,
        jwt: true,
        lastLoginMethod: true,
        // Emails (to the outbox) about new-device sign-ins, password changes, two-factor and passkeys.
        securityAlerts: true,
        // Refuses breached passwords: off unless PLAYGROUND_HIBP=1, since the seeded and test accounts use one.
        haveIBeenPwned: process.env.PLAYGROUND_HIBP === '1',
        // Captcha on signing up, when .env has keys (Cloudflare's test keys always pass; see .env.example).
        captcha: process.env.PLAYGROUND_CAPTCHA_SITE_KEY
            ? { provider: 'cloudflare-turnstile', siteKey: process.env.PLAYGROUND_CAPTCHA_SITE_KEY }
            : false,
        // The pages' language: en or es.
        locale: process.env.PLAYGROUND_LOCALE === 'es' ? 'es' : 'en',
        // Delivery to the playground outbox, and an HTML verification email; the rest are plain-text defaults.
        emails: {
            send: './server/emails/send.ts',
            templates: { 'verify-email': './server/emails/verify-email.ts' }
        }
    },
    // On the port of NUXT_PUBLIC_SITE_URL, so OAuth callbacks (built from it) reach this dev server.
    devServer: { port: Number(new URL(process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3001').port) || 3001 },
    css: ['~/assets/css/main.css'],
    compatibilityDate: '2026-06-30',
    devtools: { enabled: false }
});
