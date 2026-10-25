import { beforeAll, describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath } from './helpers';

// API keys (betterAuthUi.apiKey, on in the playground with projects:read and projects:write), against the built server.
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const create = (body: unknown, cookie: string) =>
    fetch(`${base}/api/_better-auth-ui/api-keys`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const get = (path: string, cookie: string) => fetch(`${base}${path}`, { headers: { cookie } });
const signUp = async (name: string) => {
    await auth('/sign-up/email', { name, email: `${name}@keys.test`, password: 'password123' });
    const cookie = cookiesOf(await auth('/sign-in/email', { email: `${name}@keys.test`, password: 'password123' }));
    const { id } = new Database(databasePath)
        .prepare('select id from user where email = ?')
        .get(`${name}@keys.test`) as {
        id: string;
    };
    return { cookie, id };
};
const audited = (action: string, targetId: string) =>
    (
        new Database(databasePath)
            .prepare('select count(*) as count from adminAuditLog where action = ? and targetId = ?')
            .get(action, targetId) as { count: number }
    ).count;

let owner: { cookie: string; id: string };
let adminCookie: string;
beforeAll(async () => {
    owner = await signUp('keyholder');
    await signUp('keysadmin');
    new Database(databasePath).prepare("update user set role = 'admin' where email = 'keysadmin@keys.test'").run();
    adminCookie = cookiesOf(await auth('/sign-in/email', { email: 'keysadmin@keys.test', password: 'password123' }));
});

describe('API keys', () => {
    it('show in the capabilities', async () => {
        expect((await (await fetch(`${base}/api/_better-auth-ui/capabilities`)).json()).apiKey).toBe(true);
    });

    it('are created with a name, an expiry and allowed permissions only', async () => {
        expect((await create({ name: 'CI' }, '')).status).toBe(401);
        expect((await create({ name: '  ' }, owner.cookie)).status).toBe(400);
        expect((await create({ name: 'CI', expiresInDays: 7 }, owner.cookie)).status).toBe(400);
        expect((await create({ name: 'CI', scopes: ['admin:everything'] }, owner.cookie)).status).toBe(400);

        const response = await create({ name: 'CI', expiresInDays: 30, scopes: ['projects:read'] }, owner.cookie);
        expect(response.status).toBe(200);
        const created = await response.json();
        expect(created.key).toMatch(/^pg_/);
        expect(audited('auth.api-key-created', owner.id)).toBe(1);

        // Better Auth's own list: the key's start, never the key.
        const listed = await (await get('/api/auth/api-key/list', owner.cookie)).json();
        const key = listed.apiKeys.find((item: { id: string }) => item.id === created.id);
        expect(key).toMatchObject({ name: 'CI', start: created.key.slice(0, 6) });
        expect(JSON.stringify(listed)).not.toContain(created.key);
        expect(JSON.stringify(key.permissions)).toContain('read');
        expect(new Date(key.expiresAt).getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    });

    it('are in the data download, without the key', async () => {
        const text = await (await get('/api/_better-auth-ui/export', owner.cookie)).text();
        expect(JSON.parse(text).apiKeys).toEqual([expect.objectContaining({ name: 'CI' })]);
        expect(text).not.toMatch(/"key"/);
    });

    it('are deleted by their owner through Better Auth, audit-logged', async () => {
        const { id } = await (await create({ name: 'Temp' }, owner.cookie)).json();
        expect((await auth('/api-key/delete', { keyId: id }, owner.cookie)).status).toBe(200);
        expect(audited('auth.api-key-deleted', owner.id)).toBe(1);
    });

    it('are listed and revoked by admins', async () => {
        const { id } = await (await create({ name: 'Leaked' }, owner.cookie)).json();
        const base_ = `/api/_better-auth-ui/users/${owner.id}/api-keys`;
        expect((await get(base_, owner.cookie)).status).toBe(403);
        const keys = await (await get(base_, adminCookie)).json();
        expect(keys.map((key: { name: string }) => key.name)).toEqual(expect.arrayContaining(['CI', 'Leaked']));
        expect(JSON.stringify(keys)).not.toMatch(/"key"/);

        const revoke = await fetch(`${base}${base_}/${id}`, {
            method: 'DELETE',
            headers: { cookie: adminCookie, origin: base }
        });
        expect(revoke.status).toBe(200);
        expect(audited('user.api-key-revoke', owner.id)).toBe(1);
        const after = await (await get(base_, adminCookie)).json();
        expect(after.map((key: { id: string }) => key.id)).not.toContain(id);
    });
});
