export default defineNuxtConfig({
    // Installs @nuxt/ui and @nuxtjs/better-auth itself, through its module dependencies.
    modules: ['@treygrr/nuxt-better-auth-admin'],
    // Sign in as a user from their page; the banner in app.vue offers the way back.
    betterAuthAdmin: {
        impersonation: true,
        // Delivery to the playground outbox, and an HTML verification email; the rest are plain-text defaults.
        emails: {
            send: './server/emails/send.ts',
            templates: { 'verify-email': './server/emails/verify-email.ts' }
        },
        // A role with some of the admin's permissions: it sees only those actions in the admin pages.
        roles: {
            moderator: { user: ['list', 'get', 'update', 'ban'], session: ['list', 'revoke'] }
        }
    },
    css: ['~/assets/css/main.css'],
    compatibilityDate: '2026-06-30',
    devtools: { enabled: false }
});
