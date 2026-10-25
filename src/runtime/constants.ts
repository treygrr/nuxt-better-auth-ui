// Shared by the module (at build time) and the runtime, so this file must not import #imports.

/** The module's own server routes. Better Auth's admin endpoints stay at /api/auth/admin/*. */
export const ADMIN_API = '/api/_better-auth-ui';

/** Where the demo data from the Nuxt UI dashboard template is served (inbox, customers, members, notifications). */
export const DEMO_API = `${ADMIN_API}/demo`;
