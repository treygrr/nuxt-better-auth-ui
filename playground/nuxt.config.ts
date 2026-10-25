export default defineNuxtConfig({
    // Installs @nuxt/ui and @nuxtjs/better-auth itself, through its module dependencies.
    modules: ['@treygrr/nuxt-better-auth-ui'],
    betterAuthUi: {
        admin: {
            // Sign in as a user from their page; the banner in app.vue offers the way back.
            impersonation: true,
            // Opt-in "last active" and "online now"; a short interval to see it work.
            activityTracking: { enabled: true, updateInterval: 60_000 },
            // A role with some of the admin's permissions: it sees only those actions in the admin pages.
            roles: {
                moderator: { user: ['list', 'get', 'update', 'ban'], session: ['list', 'revoke'] }
            }
        },
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
