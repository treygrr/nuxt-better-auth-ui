import { getMigrations } from 'better-auth/db/migration';

import { seedMockUsers, type SeedContext } from '../seed/mock-users';

/**
 * Creates or updates Better Auth's tables (including the Admin plugin's columns), then seeds the
 * development data from .env: an admin to sign in with, and mock users for the admin pages.
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
    let admin = (await context.internalAdapter.findUserByEmail(adminEmail))?.user;
    if (!admin) {
        ({ user: admin } = await auth.api.signUpEmail({
            body: { name: 'Playground Admin', email: adminEmail, password: adminPassword }
        }));
    }
    await context.internalAdapter.updateUser(admin.id, { role: 'admin', emailVerified: true });

    const count = Number(process.env.PLAYGROUND_MOCK_USERS ?? 0);
    const created = await seedMockUsers(context as unknown as SeedContext, count, adminPassword);
    console.info(
        `[playground] Sign in as ${adminEmail} (admin). ${count} mock users (${created} new); their password is the admin's.`
    );
});
