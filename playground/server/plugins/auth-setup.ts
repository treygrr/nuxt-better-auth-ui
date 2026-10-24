import { getMigrations } from 'better-auth/db/migration';

/**
 * Creates or updates Better Auth's tables (including the Admin plugin's columns), then seeds the
 * development accounts from .env: an admin to sign in with and some users for the admin pages to list.
 * Both steps run in one plugin because Nitro doesn't wait for async plugins.
 */
export default defineNitroPlugin(async () => {
    if (import.meta.prerender) return;
    const auth = await ensureServerAuth();
    const { runMigrations } = await getMigrations(auth.options);
    await runMigrations();

    const adminEmail = process.env.PLAYGROUND_ADMIN_EMAIL;
    const adminPassword = process.env.PLAYGROUND_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) return;

    const context = await auth.$context;
    const ensureUser = async (name: string, email: string, password: string) => {
        const existing = await context.internalAdapter.findUserByEmail(email);
        if (existing) return existing.user;
        const { user } = await auth.api.signUpEmail({ body: { name, email, password } });
        return user;
    };

    const admin = await ensureUser('Playground Admin', adminEmail, adminPassword);
    await context.internalAdapter.updateUser(admin.id, { role: 'admin', emailVerified: true });

    const demoUsers = Number(process.env.PLAYGROUND_DEMO_USERS ?? 0);
    for (let i = 1; i <= demoUsers; i++) {
        await ensureUser(`Demo User ${i}`, `demo${i}@example.com`, adminPassword);
    }
    console.info(`[playground] Sign in as ${adminEmail} (admin); ${demoUsers} demo users.`);
});
