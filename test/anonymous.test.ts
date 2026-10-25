import { describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath } from './helpers';

// Guest accounts (betterAuthUi.anonymous, on in the playground), against the built server.
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const page = (path: string, cookie: string) => fetch(`${base}${path}`, { redirect: 'manual', headers: { cookie } });
const userRow = (id: string) =>
    new Database(databasePath).prepare('select id, email, isAnonymous from user where id = ?').get(id) as
        { id: string; email: string; isAnonymous: number } | undefined;

const startGuest = async () => {
    const response = await auth('/sign-in/anonymous', {});
    expect(response.status).toBe(200);
    const { user } = await response.json();
    return { cookie: cookiesOf(response), id: user.id as string };
};

describe('guest accounts', () => {
    it('show in the capabilities', async () => {
        const capabilities = await (await fetch(`${base}/api/_better-auth-ui/capabilities`)).json();
        expect(capabilities.anonymous).toEqual({ deleteAccount: true });
    });

    it('start with no email or password, once per guest', async () => {
        const { cookie, id } = await startGuest();
        expect(userRow(id)).toMatchObject({ isAnonymous: 1 });
        expect((await auth('/sign-in/anonymous', {}, cookie)).status).toBe(400);
    });

    it('let guests, not other signed-in users, open the sign-in and sign-up pages', async () => {
        const { cookie } = await startGuest();
        expect((await page('/login', cookie)).status).toBe(200);
        expect((await page('/signup', cookie)).status).toBe(200);
        expect((await page('/account', cookie)).status).toBe(200);

        await auth('/sign-up/email', { name: 'Member', email: 'member@guest.test', password: 'password123' });
        const member = cookiesOf(await auth('/sign-in/email', { email: 'member@guest.test', password: 'password123' }));
        for (const path of ['/login', '/signup']) {
            const response = await page(path, member);
            expect(response.status).toBe(302);
            expect(response.headers.get('location')).toBe('/');
        }
    });

    it('are kept by signing up: the guest moves to the new account', async () => {
        const { cookie, id } = await startGuest();
        const signUp = await auth(
            '/sign-up/email',
            { name: 'Kept', email: 'kept@guest.test', password: 'password123' },
            cookie
        );
        expect(signUp.status).toBe(200);
        const { user } = await signUp.json();
        expect(user.id).not.toBe(id);
        // Better Auth deletes the guest account once it's linked.
        expect(userRow(id)).toBeUndefined();
        expect(userRow(user.id)).toMatchObject({ email: 'kept@guest.test', isAnonymous: 0 });
        // The app's onLinkAccount (the playground's records it) ran first, to move the guest's data.
        const linked = await (await fetch(`${base}/api/_playground/linked-guests`)).json();
        expect(linked).toContainEqual({ from: id, to: user.id });
    });

    it('can be deleted by the guest', async () => {
        const { cookie, id } = await startGuest();
        expect((await auth('/delete-anonymous-user', {}, cookie)).status).toBe(200);
        expect(userRow(id)).toBeUndefined();
    });

    it('can be listed on their own in the admin', async () => {
        const { id } = await startGuest();
        await auth('/sign-up/email', { name: 'Guest Admin', email: 'admin@guest.test', password: 'password123' });
        new Database(databasePath).prepare("update user set role = 'admin' where email = 'admin@guest.test'").run();
        const admin = cookiesOf(await auth('/sign-in/email', { email: 'admin@guest.test', password: 'password123' }));
        const query = new URLSearchParams({ filterField: 'isAnonymous', filterValue: 'true', filterOperator: 'eq' });
        const { users } = await (
            await fetch(`${base}/api/auth/admin/list-users?${query}`, { headers: { cookie: admin } })
        ).json();
        expect(users.map((user: { id: string }) => user.id)).toContain(id);
        expect(users.every((user: { isAnonymous: boolean }) => user.isAnonymous)).toBe(true);
    });
});
