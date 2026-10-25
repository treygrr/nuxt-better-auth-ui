// Shared by the module (at build time) and the runtime, so this file must not import #imports.

/** The module's own server routes. Better Auth's endpoints stay at /api/auth/*. */
export const UI_API = '/api/_better-auth-ui';

/** The admin dashboard's routes. */
export const ADMIN_API = UI_API;

/** Where the demo data from the Nuxt UI dashboard template is served (inbox, customers, members, notifications). */
export const DEMO_API = `${ADMIN_API}/demo`;
