import { defineBuildConfig } from 'unbuild';

// Besides the module, `@treygrr/nuxt-better-auth-ui/emails`: built into dist/emails.mjs, and stubbed there by
// `nuxt-module-build build --stub`, so the playground can import it in development too.
export default defineBuildConfig({
    entries: ['./src/emails'],
    externals: ['#better-auth-ui/email-config']
});
