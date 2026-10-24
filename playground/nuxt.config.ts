export default defineNuxtConfig({
    // Installs @nuxt/ui and @nuxtjs/better-auth itself, through its module dependencies.
    modules: ['@treygrr/nuxt-better-auth-admin'],
    // Sign in as a user from their page; the banner in app.vue offers the way back.
    betterAuthAdmin: { impersonation: true },
    css: ['~/assets/css/main.css'],
    compatibilityDate: '2026-06-30',
    devtools: { enabled: false }
});
