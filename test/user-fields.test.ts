import { beforeAll, describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath } from './helpers';

// The app's own user fields (the playground's user.additionalFields), against the built server.
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });

let adminCookie: string;
let userCookie: string;
let userId: string;
beforeAll(async () => {
    await auth('/sign-up/email', { name: 'Fran', email: 'fran@fields.test', password: 'password123', company: 'Acme' });
    await auth('/sign-up/email', { name: 'Fields Admin', email: 'admin@fields.test', password: 'password123' });
    const db = new Database(databasePath);
    db.prepare("update user set role = 'admin' where email = 'admin@fields.test'").run();
    userId = (db.prepare('select id from user where email = ?').get('fran@fields.test') as { id: string }).id;
    adminCookie = cookiesOf(await auth('/sign-in/email', { email: 'admin@fields.test', password: 'password123' }));
    userCookie = cookiesOf(await auth('/sign-in/email', { email: 'fran@fields.test', password: 'password123' }));
});

describe("the app's user fields", () => {
    it('are listed for staff, server-owned ones as not editable', async () => {
        expect(
            (await fetch(`${base}/api/_better-auth-ui/user-fields`, { headers: { cookie: userCookie } })).status
        ).toBe(403);
        const fields = await (
            await fetch(`${base}/api/_better-auth-ui/user-fields`, { headers: { cookie: adminCookie } })
        ).json();
        expect(fields).toEqual([
            { name: 'company', type: 'string', required: false, editable: true },
            { name: 'plan', type: ['free', 'pro'], required: false, editable: false },
            { name: 'newsletter', type: 'boolean', required: false, editable: true },
            { name: 'birthday', type: 'date', required: false, editable: true }
        ]);
    });

    it("come with the user, and are saved through Better Auth's admin update", async () => {
        const user = await (
            await fetch(`${base}/api/auth/admin/get-user?id=${userId}`, { headers: { cookie: adminCookie } })
        ).json();
        expect(user).toMatchObject({ company: 'Acme', plan: 'free', newsletter: false });

        const update = await auth(
            '/admin/update-user',
            { userId, data: { company: 'Globex', newsletter: true, birthday: '1990-04-01T00:00:00.000Z' } },
            adminCookie
        );
        expect(update.status).toBe(200);
        const row = new Database(databasePath)
            .prepare('select company, newsletter from user where id = ?')
            .get(userId) as { company: string; newsletter: number };
        expect(row).toEqual({ company: 'Globex', newsletter: 1 });
    });
});
