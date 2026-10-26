import { beforeAll, describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath, totp } from './helpers';

/** Signs up (or in) and returns the session cookie */
const signIn = async (name: string, path: 'sign-up' | 'sign-in') => {
    const response = await fetch(`${base}/api/auth/${path}/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base },
        body: JSON.stringify({ name, email: `${name}@extensions.test`, password: 'password123' })
    });
    expect(response.ok).toBe(true);
    return cookiesOf(response);
};

const get = (path: string, cookie?: string) =>
    fetch(`${base}${path}`, { redirect: 'manual', headers: cookie ? { cookie } : {} });

const post = (path: string, body: object, cookie: string) =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });

let userCookie: string;
let adminCookie: string;
let moderatorCookie: string;

beforeAll(async () => {
    userCookie = await signIn('ext-user', 'sign-up');
    await signIn('ext-admin', 'sign-up');
    new Database(databasePath)
        .prepare("update user set role = 'admin' where email = 'ext-admin@extensions.test'")
        .run();
    adminCookie = await signIn('ext-admin', 'sign-in');

    // Moderators can open the admin pages but not set roles; the playground requires them to have two-factor on.
    await signIn('ext-mod', 'sign-up');
    new Database(databasePath)
        .prepare("update user set role = 'moderator' where email = 'ext-mod@extensions.test'")
        .run();
    const cookie = await signIn('ext-mod', 'sign-in');
    const { totpURI } = await (await post('/two-factor/enable', { password: 'password123' }, cookie)).json();
    const verified = await post('/two-factor/verify-totp', { code: totp(totpURI) }, cookie);
    expect(verified.status).toBe(200);
    moderatorCookie = cookiesOf(verified);
});

// The playground's own admin page (/admin/roles) and its API route, built on the module's extension points.
describe("the app's own admin pages", () => {
    it('check permissions in their API routes with requireBetterAuthAdmin', async () => {
        expect((await get('/api/reports/roles')).status).toBe(401);
        expect((await get('/api/reports/roles', userCookie)).status).toBe(403);
        const response = await get('/api/reports/roles', adminCookie);
        expect(response.status).toBe(200);
        const roles: Array<{ role: string; users: number }> = await response.json();
        expect(roles.find((row) => row.role === 'admin')?.users).toBeGreaterThanOrEqual(1);
    });

    it('render in the admin layout, with their sidebar entry, for staff only', async () => {
        const page = await get('/admin/roles', adminCookie);
        expect(page.status).toBe(200);
        const html = await page.text();
        // The sidebar's link to it, next to the module's own.
        expect(html).toMatch(/href="\/admin\/roles"/);
        expect(html).toMatch(/href="\/admin\/users"/);

        // Like the module's pages: signed-out visitors are sent to sign in, other users refused.
        const signedOut = await get('/admin/roles');
        expect(signedOut.status).toBe(302);
        expect(signedOut.headers.get('location')).toContain('/login?redirect=%2Fadmin%2Froles');
        expect((await get('/admin/roles', userCookie)).status).toBe(403);
    });

    it('are kept from staff without the permissions in their page meta, and left out of their sidebar', async () => {
        expect((await get('/admin/roles', moderatorCookie)).status).toBe(403);
        expect((await get('/api/reports/roles', moderatorCookie)).status).toBe(403);
        const users = await get('/admin/users', moderatorCookie);
        expect(users.status).toBe(200);
        expect(await users.text()).not.toMatch(/href="\/admin\/roles"/);
    });
});
