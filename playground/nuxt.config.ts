export default defineNuxtConfig({
    // Installs @nuxt/ui and @nuxtjs/better-auth itself, through its module dependencies. nuxt-skill-hub writes Nuxt's
    // best-practice guides for coding agents (.claude/skills/, git-ignored) on `nuxt prepare`; nothing at runtime.
    modules: ['@treygrr/nuxt-better-auth-ui', 'nuxt-skill-hub'],
    // This repository is a Nuxt module: include the module authoring guide.
    skillHub: { skillName: 'nuxt-better-auth-ui', moduleAuthoring: true, targets: ['claude-code'] },
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
        // Several accounts signed in at once: "Add another account" and a switcher (account page, admin menu).
        multiSession: { enabled: true },
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
        organization: {
            enabled: true,
            // The app's own resource, a custom role, and a permission added to Better Auth's admin.
            statements: { project: ['create', 'update', 'delete'] },
            roles: { editor: { project: ['create', 'update'] }, admin: { project: ['create', 'update', 'delete'] } },
            // Owners and admins create their own roles, and organize members into teams.
            dynamicRoles: true,
            teams: true,
            // The app's own field on organizations, shown and edited on the organization's page.
            schema: { organization: { additionalFields: { website: { type: 'string', required: false } } } },
            // Hooks and other function options.
            serverOptions: './server/auth/organization.ts'
        },
        // Single sign-on: "Sign in with SSO", an SSO tab on organizations' pages for their OIDC and SAML providers, and
        // the admin's list. Providers work once their domains are verified (a DNS TXT record); the tests' mock identity
        // provider is at /api/_playground/oidc. Who joins as what is in serverOptions.
        sso: {
            enabled: true,
            domainVerification: true,
            organizationProvisioning: { defaultRole: 'member' },
            serverOptions: './server/auth/sso.ts'
        },
        // A "Billing" tab and each user's subscription in the admin. The prices are made up: with STRIPE_SECRET_KEY and
        // your own test prices, Checkout and the billing portal work; without, the pages show and Stripe calls fail.
        stripe: {
            enabled: true,
            // Your own test-mode prices, from .env, to try Checkout for real (see test/stripe-live.test.ts).
            plans: [
                {
                    name: 'basic',
                    priceId: process.env.PLAYGROUND_STRIPE_PRICE_BASIC || 'price_playground_basic',
                    limits: { projects: 5 }
                },
                {
                    name: 'pro',
                    priceId: process.env.PLAYGROUND_STRIPE_PRICE_PRO || 'price_playground_pro',
                    annualDiscountPriceId:
                        process.env.PLAYGROUND_STRIPE_PRICE_PRO_YEARLY || 'price_playground_pro_yearly',
                    limits: { projects: 50 },
                    freeTrial: { days: 14 }
                }
            ]
        },
        // Session tokens in an Authorization header, and JWTs verified with /api/auth/jwks.
        bearer: true,
        jwt: true,
        // Provider sign-ins (GitHub, the tests' mock) in a popup.
        oauthPopup: true,
        lastLoginMethod: true,
        // Emails (to the outbox) about new-device sign-ins, password changes, two-factor and passkeys.
        securityAlerts: true,
        // Refuses breached passwords: off unless PLAYGROUND_HIBP=1, since the seeded and test accounts use one.
        haveIBeenPwned: process.env.PLAYGROUND_HIBP === '1',
        // Captcha on signing up, when .env has keys (Cloudflare's test keys always pass; see .env.example).
        captcha: process.env.PLAYGROUND_CAPTCHA_SITE_KEY
            ? { provider: 'cloudflare-turnstile', siteKey: process.env.PLAYGROUND_CAPTCHA_SITE_KEY }
            : false,
        // The app's own words for a few of the module's (any key, any language): here, organizations are "teams".
        messages: { en: { 'account.tabs.organizations': 'Teams' } },
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
