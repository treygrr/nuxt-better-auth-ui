import { getMigrations } from 'better-auth/db/migration';

// Create or update Better Auth's tables on startup, including the Admin plugin's columns.
export default defineNitroPlugin(async () => {
    if (import.meta.prerender) return;
    const auth = await ensureServerAuth();
    const { runMigrations } = await getMigrations(auth.options);
    await runMigrations();
});
