// Besides the module, `@treygrr/nuxt-better-auth-ui/emails`, `/sms` and `/providers`: built into dist/emails.mjs,
// dist/sms.mjs and dist/providers.mjs, and stubbed there by `nuxt-module-build build --stub`, so the playground can
// import them in development too. (unbuild's config; a plain object, so it needs no direct dependency on unbuild.)
export default {
    entries: ['./src/emails', './src/sms', './src/providers'],
    externals: ['#better-auth-ui/email-config', '#better-auth-ui/sms-config']
};
