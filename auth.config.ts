// Not an app: `nuxt-module-build prepare` loads Nuxt at the repo root with this module, whose
// moduleDependencies install @nuxtjs/better-auth, which requires an auth config. The playground has the real ones.
import { defineClientAuth } from '@nuxtjs/better-auth/config';

export default defineClientAuth({});
