// Besides the module, `@treygrr/nuxt-better-auth-ui/emails` and `/sms`: built into dist/emails.mjs and dist/sms.mjs,
// and stubbed there by `nuxt-module-build build --stub`, so the playground can import them in development too.
// (unbuild's config; a plain object, so it needs no direct dependency on unbuild.)
export default {
    entries: ['./src/emails', './src/sms'],
    externals: ['#better-auth-ui/email-config', '#better-auth-ui/sms-config']
};
