import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const playgroundDir = fileURLToPath(new URL('../playground', import.meta.url));
const Database = createRequire(join(playgroundDir, 'package.json'))('better-sqlite3');

const port = 3941;
const base = `http://localhost:${port}`;
const dataDir = mkdtempSync(join(tmpdir(), 'better-auth-ui-'));
const databasePath = join(dataDir, 'auth.sqlite');
let server: ChildProcess;

/** Signs up (or in) and returns the session cookie */
const signIn = async (name: string, path: 'sign-up' | 'sign-in') => {
    const response = await fetch(`${base}/api/auth/${path}/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base },
        body: JSON.stringify({ name, email: `${name}@example.com`, password: 'password123' })
    });
    expect(response.ok).toBe(true);
    return response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';')[0])
        .join('; ');
};

const get = (path: string, cookie?: string) =>
    fetch(`${base}${path}`, { redirect: 'manual', headers: cookie ? { cookie } : {} });

/** A response's cookies, to send with the next request. */
const cookiesOf = (response: Response) =>
    response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';')[0])
        .join('; ');

/** The current code for an otpauth:// URI, as an authenticator app works it out (RFC 6238). */
const totp = (uri: string) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits = [...new URL(uri).searchParams.get('secret')!.replace(/=+$/, '')]
        .map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0'))
        .join('');
    const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
    const hmac = createHmac('sha1', key).update(counter).digest();
    const offset = hmac[hmac.length - 1]! & 0xf;
    return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
};

/** Turns on two-factor with an authenticator app, as the account page does; returns the new session's cookie. */
const setUpTwoFactor = async (cookie: string, password?: string) => {
    const post = (path: string, body: object, cookie: string) =>
        fetch(`${base}/api/auth${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie },
            body: JSON.stringify(body)
        });
    const { totpURI, backupCodes } = await (await post('/two-factor/enable', { password }, cookie)).json();
    const verified = await post('/two-factor/verify-totp', { code: totp(totpURI) }, cookie);
    expect(verified.status).toBe(200);
    return { cookie: cookiesOf(verified), uri: totpURI as string, backupCodes: backupCodes as string[] };
};

let userCookie: string;
let adminCookie: string;

beforeAll(async () => {
    execSync('pnpm exec nuxt build', { cwd: playgroundDir, stdio: 'pipe' });
    server = spawn(process.execPath, ['.output/server/index.mjs'], {
        cwd: playgroundDir,
        env: {
            ...process.env,
            PORT: String(port),
            AUTH_DATABASE_PATH: databasePath,
            NUXT_APP_SECRET: 'playground-secret-at-least-32-characters-long',
            NUXT_PUBLIC_SITE_URL: base,
            PLAYGROUND_MOCK_OAUTH: '1'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    await new Promise<void>((resolve, reject) => {
        const onData = (data: Buffer) => {
            output += data;
            if (output.includes('Listening on')) resolve();
        };
        server.stdout!.on('data', onData);
        server.stderr!.on('data', onData);
        server.once('exit', (code) => reject(new Error(`Server exited with ${code}:\n${output}`)));
    });

    userCookie = await signIn('alice', 'sign-up');
    await signIn('bob', 'sign-up');
    // There's no admin yet to grant the role, so set it in the database, as an app would once.
    new Database(databasePath).prepare("update user set role = 'admin' where email = 'bob@example.com'").run();
    adminCookie = await signIn('bob', 'sign-in');
});

afterAll(async () => {
    if (server?.exitCode === null) {
        server.kill('SIGTERM');
        await once(server, 'exit');
    }
    rmSync(dataDir, { recursive: true, force: true });
});

describe('the admin pages', () => {
    it('add the Admin plugin columns to the user table', () => {
        const columns = new Database(databasePath)
            .prepare("select name from pragma_table_info('user')")
            .all()
            .map((column: { name: string }) => column.name);
        expect(columns).toEqual(expect.arrayContaining(['role', 'banned', 'banReason', 'banExpires']));
    });

    it('send signed-out visitors to the login page', async () => {
        const response = await get('/admin');
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toContain('/login?redirect=%2Fadmin');
    });

    it('refuse signed-in users without the admin role', async () => {
        expect((await get('/admin', userCookie)).status).toBe(403);
        expect((await get('/admin/users', userCookie)).status).toBe(403);
        expect((await get('/api/auth/admin/list-users', userCookie)).status).toBe(403);
    });

    it('render the dashboard for admins', async () => {
        const response = await get('/admin', adminCookie);
        expect(response.status).toBe(200);
        const html = await response.text();
        // The sidebar: the app's name, then the admin's own pages.
        for (const label of [
            'Better Auth',
            'Home',
            'Users',
            'Sessions',
            'Audit log',
            'Configuration',
            'Back to site'
        ]) {
            expect(html, label).toContain(label);
        }
        // Nothing left from the dashboard template's sample pages.
        for (const label of ['Inbox', 'Customers', 'NuxtHub', 'cookies']) expect(html, label).not.toContain(label);
    });

    it.each(['/admin', '/admin/users', '/admin/sessions', '/admin/audit', '/admin/configuration'])(
        'render %s for admins',
        async (path) => {
            expect((await get(path, adminCookie)).status).toBe(200);
        }
    );

    it("removes the dashboard template's sample pages and data", async () => {
        for (const path of ['/admin/inbox', '/admin/customers', '/admin/settings', '/api/_better-auth-ui/demo/mails']) {
            expect((await get(path, adminCookie)).status, path).toBe(404);
        }
    });

    it('shows the configuration, and what each role can do', async () => {
        const html = await (await get('/admin/configuration', adminCookie)).text();
        for (const text of [
            'Signing in',
            'Security',
            'Self-service',
            'Emails',
            'Admin records',
            'Roles and permissions'
        ]) {
            expect(html, text).toContain(text);
        }
        // The playground's moderators: required to use two-factor, and can ban but not delete.
        expect(html).toContain('Moderator');
        expect(html).toContain('Ban and unban');
        expect(html).toContain('Delete users');
    });

    it("give admins Better Auth's admin API", async () => {
        const response = await get('/api/auth/admin/list-users', adminCookie);
        expect(response.status).toBe(200);
        const { users } = await response.json();
        expect(users.map((user: { email: string }) => user.email).sort()).toEqual([
            'alice@example.com',
            'bob@example.com'
        ]);
    });
});

describe('user management', () => {
    const post = (path: string, body: unknown, cookie = adminCookie) =>
        fetch(`${base}/api/auth/admin/${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie },
            body: JSON.stringify(body)
        });
    const signInAs = (email: string, password: string) =>
        fetch(`${base}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base },
            body: JSON.stringify({ email, password })
        });
    const getUser = async (id: string) => (await get(`/api/auth/admin/get-user?id=${id}`, adminCookie)).json();
    const listUsers = async (query: string) => (await get(`/api/auth/admin/list-users?${query}`, adminCookie)).json();

    let carolId: string;

    it('creates a user who can sign in', async () => {
        const response = await post('create-user', {
            name: 'carol',
            email: 'carol@example.com',
            password: 'password123',
            role: 'user'
        });
        expect(response.status).toBe(200);
        carolId = (await response.json()).user.id;
        expect((await signInAs('carol@example.com', 'password123')).status).toBe(200);
    });

    it('edits a user and changes their role', async () => {
        expect(
            (await post('update-user', { userId: carolId, data: { name: 'Carol', emailVerified: true } })).status
        ).toBe(200);
        expect((await post('set-role', { userId: carolId, role: 'admin' })).status).toBe(200);
        const carol = await getUser(carolId);
        expect(carol).toMatchObject({ name: 'Carol', emailVerified: true, role: 'admin' });
        expect((await post('set-role', { userId: carolId, role: 'user' })).status).toBe(200);
    });

    it('filters the list by role, ban and verification', async () => {
        expect(
            (await listUsers('filterField=role&filterValue=admin')).users.map((u: { email: string }) => u.email)
        ).toEqual(['bob@example.com']);
        const verified = await listUsers('filterField=emailVerified&filterValue=true');
        expect(verified.users.map((u: { email: string }) => u.email)).toContain('carol@example.com');
    });

    it('lists and revokes sessions', async () => {
        const { sessions } = await (await post('list-user-sessions', { userId: carolId })).json();
        expect(sessions.length).toBeGreaterThan(0);
        expect((await post('revoke-user-session', { sessionToken: sessions[0].token })).status).toBe(200);
        expect((await post('revoke-user-sessions', { userId: carolId })).status).toBe(200);
        expect((await (await post('list-user-sessions', { userId: carolId })).json()).sessions).toEqual([]);
    });

    it('bans with a reason and expiry, which blocks sign-in, then unbans', async () => {
        expect((await post('ban-user', { userId: carolId, banReason: 'Spam', banExpiresIn: 3600 })).status).toBe(200);
        const carol = await getUser(carolId);
        expect(carol).toMatchObject({ banned: true, banReason: 'Spam' });
        expect(new Date(carol.banExpires).getTime()).toBeGreaterThan(Date.now());
        expect((await listUsers('filterField=banned&filterValue=true')).users.map((u: { id: string }) => u.id)).toEqual(
            [carolId]
        );
        expect((await signInAs('carol@example.com', 'password123')).status).toBe(403);

        expect((await post('unban-user', { userId: carolId })).status).toBe(200);
        expect((await signInAs('carol@example.com', 'password123')).status).toBe(200);
    });

    it("sets a user's password", async () => {
        expect((await post('set-user-password', { userId: carolId, newPassword: 'new-password-456' })).status).toBe(
            200
        );
        expect((await signInAs('carol@example.com', 'password123')).status).toBe(401);
        expect((await signInAs('carol@example.com', 'new-password-456')).status).toBe(200);
    });

    it("doesn't let admins ban themselves", async () => {
        const { users } = await listUsers('searchValue=bob@example.com&searchField=email');
        expect((await post('ban-user', { userId: users[0].id })).status).toBe(400);
    });

    it("doesn't let other users manage anyone", async () => {
        expect((await post('ban-user', { userId: carolId }, userCookie)).status).toBe(403);
        expect((await post('remove-user', { userId: carolId }, userCookie)).status).toBe(403);
    });

    it('deletes a user', async () => {
        expect((await post('remove-user', { userId: carolId })).status).toBe(200);
        expect((await get(`/api/auth/admin/get-user?id=${carolId}`, adminCookie)).status).toBe(404);
        expect((await signInAs('carol@example.com', 'new-password-456')).status).toBe(401);
    });
});

describe("a user's sign-in methods", () => {
    const accounts = (id: string, cookie?: string) => get(`/api/_better-auth-ui/users/${id}/accounts`, cookie);
    const aliceId = async () =>
        (await (await get('/api/auth/admin/list-users?searchValue=alice@&searchField=email', adminCookie)).json())
            .users[0].id;

    it('lists them for admins, without passwords or tokens', async () => {
        const response = await accounts(await aliceId(), adminCookie);
        expect(response.status).toBe(200);
        const list = await response.json();
        expect(list).toHaveLength(1);
        expect(list[0]).toMatchObject({ providerId: 'credential' });
        expect(Object.keys(list[0]).sort()).toEqual([
            'accountId',
            'createdAt',
            'id',
            'providerId',
            'scope',
            'updatedAt'
        ]);
        expect(JSON.stringify(list)).not.toMatch(/password|token/i);
    });

    it('refuses users without the permission', async () => {
        expect((await accounts(await aliceId(), userCookie)).status).toBe(403);
    });

    it('refuses signed-out requests', async () => {
        expect((await accounts(await aliceId())).status).toBe(401);
    });

    it('returns 404 for unknown users', async () => {
        expect((await accounts('no-such-user', adminCookie)).status).toBe(404);
    });
});

describe('removing sign-in methods', () => {
    const remove = (userId: string, accountId: string, cookie?: string) =>
        fetch(`${base}/api/_better-auth-ui/users/${userId}/accounts/${accountId}`, {
            method: 'DELETE',
            headers: { origin: base, ...(cookie && { cookie }) }
        });
    const listAccounts = async (userId: string) =>
        (await get(`/api/_better-auth-ui/users/${userId}/accounts`, adminCookie)).json();
    const alice = async () =>
        (await (await get('/api/auth/admin/list-users?searchValue=alice@&searchField=email', adminCookie)).json())
            .users[0];

    /** Links a GitHub account to the user, as signing in with GitHub would. */
    const linkGitHub = (userId: string) => {
        const db = new Database(databasePath);
        const credential = db
            .prepare("select * from account where userId = ? and providerId = 'credential'")
            .get(userId);
        db.prepare(
            'insert into account (id, accountId, providerId, userId, createdAt, updatedAt) values (?, ?, ?, ?, ?, ?)'
        ).run('github-account', 'gh-12345', 'github', userId, credential.createdAt, credential.updatedAt);
    };

    it("refuses to remove someone's only sign-in method", async () => {
        const { id } = await alice();
        const [only] = await listAccounts(id);
        const response = await remove(id, only.id, adminCookie);
        expect(response.status).toBe(400);
        expect((await response.json()).statusMessage).toMatch(/only sign-in method/);
        expect(await listAccounts(id)).toHaveLength(1);
    });

    it('refuses users without the permission, signed-out requests and unknown methods', async () => {
        const { id } = await alice();
        linkGitHub(id);
        expect((await remove(id, 'github-account', userCookie)).status).toBe(403);
        expect((await remove(id, 'github-account')).status).toBe(401);
        expect((await remove(id, 'no-such-account', adminCookie)).status).toBe(404);
        expect((await remove('no-such-user', 'github-account', adminCookie)).status).toBe(404);
    });

    it('removes a linked method', async () => {
        const { id } = await alice();
        expect((await listAccounts(id)).map((a: { providerId: string }) => a.providerId).sort()).toEqual([
            'credential',
            'github'
        ]);
        expect((await remove(id, 'github-account', adminCookie)).status).toBe(200);
        expect((await listAccounts(id)).map((a: { providerId: string }) => a.providerId)).toEqual(['credential']);
    });

    it('removing the password stops it working', async () => {
        const { id } = await alice();
        linkGitHub(id);
        const credential = (await listAccounts(id)).find((a: { providerId: string }) => a.providerId === 'credential');
        expect((await remove(id, credential.id, adminCookie)).status).toBe(200);
        const response = await fetch(`${base}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base },
            body: JSON.stringify({ email: 'alice@example.com', password: 'password123' })
        });
        expect(response.status).toBe(401);
    });
});

describe("several users' sign-in methods at once", () => {
    const providersOf = (userIds: string[], cookie?: string) =>
        get(`/api/_better-auth-ui/accounts?userIds=${userIds.join(',')}`, cookie);
    const idOf = async (name: string) =>
        (await (await get(`/api/auth/admin/list-users?searchValue=${name}@&searchField=email`, adminCookie)).json())
            .users[0].id;

    it('returns each user’s providers, matching their own accounts list', async () => {
        const [alice, bob] = [await idOf('alice'), await idOf('bob')];
        const response = await providersOf([alice, bob, 'no-such-user'], adminCookie);
        expect(response.status).toBe(200);
        const providers = await response.json();
        for (const id of [alice, bob]) {
            const accounts = await (await get(`/api/_better-auth-ui/users/${id}/accounts`, adminCookie)).json();
            expect(providers[id].sort()).toEqual(accounts.map((a: { providerId: string }) => a.providerId).sort());
        }
        expect(providers['no-such-user']).toEqual([]);
    });

    it('refuses users without the permission', async () => {
        expect((await providersOf([await idOf('alice')], userCookie)).status).toBe(403);
    });

    it('limits how many users one request asks about', async () => {
        const ids = Array.from({ length: 101 }, (_, i) => `user-${i}`);
        expect((await providersOf(ids, adminCookie)).status).toBe(400);
    });
});

describe('reading many accounts', () => {
    it('reads past the database adapter’s default 100-row limit', async () => {
        const db = new Database(databasePath);
        const { id, createdAt } = db
            .prepare("select id, createdAt from user where email = 'alice@example.com'")
            .get() as {
            id: string;
            createdAt: string;
        };
        const before = (db.prepare('select count(*) n from account where userId = ?').get(id) as { n: number }).n;
        const insert = db.prepare(
            'insert into account (id, accountId, providerId, userId, createdAt, updatedAt) values (?, ?, ?, ?, ?, ?)'
        );
        for (let i = 0; i < 120; i++) insert.run(`many-${i}`, String(i), `provider-${i}`, id, createdAt, createdAt);
        const response = await get(`/api/_better-auth-ui/accounts?userIds=${id}`, adminCookie);
        expect((await response.json())[id]).toHaveLength(before + 120);
        db.prepare("delete from account where id like 'many-%'").run();
    });
});

describe('home page stats', () => {
    const stats = (buckets: Date[], cookie = adminCookie) =>
        get(`/api/_better-auth-ui/stats?buckets=${buckets.map((date) => date.toISOString()).join(',')}`, cookie);
    const day = 24 * 60 * 60 * 1000;

    it('counts users, sign-ups, bans and sessions from the database', async () => {
        const db = new Database(databasePath);
        const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
        // Two users who joined well before the range, to show in the previous period.
        const insert = db.prepare(
            'insert into user (id, name, email, emailVerified, createdAt, updatedAt, role, banned) values (?, ?, ?, 0, ?, ?, ?, 0)'
        );
        const old = new Date(Date.now() - 10 * day).toISOString();
        for (const id of ['stats-old-1', 'stats-old-2']) insert.run(id, id, `${id}@stats.test`, old, old, 'user');

        const now = Date.now();
        const buckets = [new Date(now - 7 * day), new Date(now - 3 * day), new Date(now + day)];
        const response = await stats(buckets);
        expect(response.status).toBe(200);
        const body = await response.json();

        expect(body.users).toBe(count('select count(*) n from user'));
        expect(body.banned).toBe(count('select count(*) n from user where banned = 1'));
        expect(body.sessions).toBe(
            count(`select count(*) n from session where expiresAt > '${new Date().toISOString()}'`)
        );
        // Everyone else joined during this test run, inside the range.
        expect(body.newUsers).toBe(body.users - 2);
        expect(body.previousNewUsers).toBe(2);
        expect(body.series).toHaveLength(2);
        expect(body.series[0].signUps + body.series[1].signUps).toBe(body.newUsers);
        expect(body.series[1].signUps).toBe(body.newUsers);
        db.prepare("delete from user where id like 'stats-old-%'").run();
    });

    it('rejects bad buckets', async () => {
        const now = Date.now();
        expect((await stats([new Date(now)])).status).toBe(400);
        expect((await stats([new Date(now), new Date(now - day)])).status).toBe(400);
        const tooMany = Array.from({ length: 121 }, (_, i) => new Date(now + i * day));
        expect((await stats(tooMany)).status).toBe(400);
    });

    it('refuses users without the permission', async () => {
        const now = Date.now();
        expect((await stats([new Date(now - day), new Date(now)], userCookie)).status).toBe(403);
    });
});

describe('impersonation', () => {
    /** Applies a response's Set-Cookie headers to a cookie header, as a browser would. */
    const withCookies = (cookie: string, response: Response) => {
        const jar = new Map(cookie.split('; ').map((pair) => pair.split(/=(.*)/s).slice(0, 2) as [string, string]));
        for (const set of response.headers.getSetCookie()) {
            const [name, value] = set.split(';')[0]!.split(/=(.*)/s) as [string, string];
            if (value && !/max-age=0/i.test(set)) jar.set(name, value);
            else jar.delete(name);
        }
        return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
    };
    const post = (path: string, cookie: string, body: unknown = {}) =>
        fetch(`${base}/api/auth${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie },
            body: JSON.stringify(body)
        });
    const sessionOf = async (cookie: string) => (await get('/api/auth/get-session', cookie)).json();
    const idOf = async (email: string) =>
        (await (await get(`/api/auth/admin/list-users?searchValue=${email}&searchField=email`, adminCookie)).json())
            .users[0].id;

    it('signs an admin in as a user, and back', async () => {
        const admin = await sessionOf(adminCookie);
        const response = await post('/admin/impersonate-user', adminCookie, { userId: await idOf('alice@') });
        expect(response.status).toBe(200);
        let cookie = withCookies(adminCookie, response);

        const impersonated = await sessionOf(cookie);
        expect(impersonated.user.email).toBe('alice@example.com');
        expect(impersonated.session.impersonatedBy).toBe(admin.user.id);
        // The admin pages are closed to them now.
        expect((await get('/api/_better-auth-ui/stats?buckets=2026-01-01,2026-01-02', cookie)).status).toBe(403);

        const stopped = await post('/admin/stop-impersonating', cookie);
        expect(stopped.status).toBe(200);
        cookie = withCookies(cookie, stopped);
        const back = await sessionOf(cookie);
        expect(back.user.id).toBe(admin.user.id);
        expect(back.session.impersonatedBy ?? null).toBeNull();
    });

    it('refuses users without the permission', async () => {
        const response = await post('/admin/impersonate-user', userCookie, { userId: await idOf('bob@') });
        expect(response.status).toBe(403);
    });

    it("can't impersonate another admin", async () => {
        const db = new Database(databasePath);
        db.prepare("update user set role = 'admin' where email = 'alice@example.com'").run();
        try {
            const response = await post('/admin/impersonate-user', adminCookie, { userId: await idOf('alice@') });
            expect(response.status).toBe(403);
        } finally {
            db.prepare("update user set role = 'user' where email = 'alice@example.com'").run();
        }
    });
});

describe('audit log', () => {
    type Entry = {
        action: string;
        actorEmail: string;
        targetId: string | null;
        targetEmail: string | null;
        details: Record<string, unknown> | null;
    };
    const post = (path: string, body: unknown, cookie = adminCookie) =>
        fetch(`${base}/api/auth${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie },
            body: JSON.stringify(body)
        });
    const log = async (query = '') => {
        const response = await get(`/api/_better-auth-ui/audit?limit=100${query}`, adminCookie);
        expect(response.status).toBe(200);
        return (await response.json()) as { entries: Entry[]; total: number };
    };
    const latest = async (query = '') => (await log(query)).entries[0]!;
    let carolId: string;

    it('records creating a user, with the new user as the target', async () => {
        const response = await post('/admin/create-user', {
            name: 'Carol',
            email: 'carol@audit.test',
            password: 'password123',
            role: 'user'
        });
        expect(response.status).toBe(200);
        carolId = (await response.json()).user.id;
        expect(await latest()).toMatchObject({
            action: 'user.create',
            actorEmail: 'bob@example.com',
            targetId: carolId,
            targetEmail: 'carol@audit.test',
            details: { role: 'user' }
        });
    });

    it('records bans with their reason and length, role changes and edits', async () => {
        await post('/admin/ban-user', { userId: carolId, banReason: 'Spam', banExpiresIn: 86400 });
        expect(await latest()).toMatchObject({
            action: 'user.ban',
            targetId: carolId,
            details: { reason: 'Spam', expiresIn: 86400 }
        });
        await post('/admin/unban-user', { userId: carolId });
        expect((await latest()).action).toBe('user.unban');
        await post('/admin/set-role', { userId: carolId, role: 'admin' });
        expect(await latest()).toMatchObject({ action: 'user.set-role', details: { role: 'admin' } });
        await post('/admin/set-role', { userId: carolId, role: 'user' });
        await post('/admin/update-user', { userId: carolId, data: { name: 'Carol B' } });
        expect(await latest()).toMatchObject({ action: 'user.update', details: { fields: ['name'] } });
    });

    it("doesn't record actions that failed", async () => {
        const before = (await log()).total;
        const self = (await (await get('/api/auth/get-session', adminCookie)).json()).user.id;
        expect((await post('/admin/ban-user', { userId: self })).ok).toBe(false);
        expect((await post('/admin/set-role', { userId: carolId, role: 'admin' }, userCookie)).ok).toBe(false);
        expect((await log()).total).toBe(before);
    });

    it("records removing a sign-in method, through the module's own route", async () => {
        const db = new Database(databasePath);
        const { createdAt } = db.prepare('select createdAt from user where id = ?').get(carolId) as {
            createdAt: string;
        };
        db.prepare(
            'insert into account (id, accountId, providerId, userId, createdAt, updatedAt) values (?, ?, ?, ?, ?, ?)'
        ).run('audit-github', '1', 'github', carolId, createdAt, createdAt);
        const response = await fetch(`${base}/api/_better-auth-ui/users/${carolId}/accounts/audit-github`, {
            method: 'DELETE',
            headers: { origin: base, cookie: adminCookie }
        });
        expect(response.status).toBe(200);
        expect(await latest()).toMatchObject({
            action: 'account.remove',
            targetId: carolId,
            details: { providerId: 'github' }
        });
    });

    it('keeps who a deleted user was', async () => {
        await post('/admin/remove-user', { userId: carolId });
        expect(await latest()).toMatchObject({
            action: 'user.delete',
            targetId: carolId,
            targetEmail: 'carol@audit.test'
        });
    });

    it('filters by user and by action', async () => {
        const carol = await log(`&userId=${carolId}`);
        expect(carol.entries.every((entry) => entry.targetId === carolId)).toBe(true);
        expect(carol.entries.map((entry) => entry.action)).toEqual([
            'user.delete',
            'account.remove',
            'user.update',
            'user.set-role',
            'user.set-role',
            'user.unban',
            'user.ban',
            'user.create'
        ]);
        const bans = await log('&action=user.ban');
        expect(bans.entries.length).toBeGreaterThan(0);
        expect(bans.entries.every((entry) => entry.action === 'user.ban')).toBe(true);
    });

    it('records impersonation, by the admin, both ways', async () => {
        const alice = (
            await (await get('/api/auth/admin/list-users?searchValue=alice@&searchField=email', adminCookie)).json()
        ).users[0].id;
        const started = await post('/admin/impersonate-user', { userId: alice });
        // The response's cookies replace the admin's, as in a browser.
        const jar = new Map(adminCookie.split('; ').map((pair) => pair.split(/=(.*)/s) as [string, string]));
        for (const set of started.headers.getSetCookie()) {
            const [name, value] = set.split(';')[0]!.split(/=(.*)/s) as [string, string];
            if (value) jar.set(name, value);
            else jar.delete(name);
        }
        const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
        expect(await latest()).toMatchObject({
            action: 'user.impersonate',
            actorEmail: 'bob@example.com',
            targetId: alice
        });
        expect((await post('/admin/stop-impersonating', {}, cookie)).status).toBe(200);
        expect(await latest()).toMatchObject({
            action: 'user.stop-impersonating',
            actorEmail: 'bob@example.com',
            targetId: alice
        });
    });

    it('is closed to users without the permission', async () => {
        expect((await get('/api/_better-auth-ui/audit', userCookie)).status).toBe(403);
        expect((await get('/api/_better-auth-ui/audit')).status).toBe(401);
    });
});

describe('audit log retention', () => {
    it('hides entries older than 30 days, and deletes them on the next write', async () => {
        const db = new Database(databasePath);
        // Stored the way Better Auth stored the existing entries.
        const sample = (db.prepare('select createdAt from adminAuditLog limit 1').get() as { createdAt: unknown })
            .createdAt;
        const at = (daysAgo: number) => {
            const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
            return typeof sample === 'number' ? date.getTime() : date.toISOString();
        };
        const insert = db.prepare(
            `insert into adminAuditLog (id, action, actorId, actorEmail, actorName, targetId, createdAt)
             values (?, 'user.unban', 'someone', 'someone@retention.test', 'Someone', 'retention-target', ?)`
        );
        insert.run('retention-old', at(40));
        insert.run('retention-recent', at(20));
        const ids = async () =>
            (
                (await (await get('/api/_better-auth-ui/audit?userId=retention-target', adminCookie)).json()) as {
                    entries: Array<{ id: string }>;
                }
            ).entries.map((entry) => entry.id);
        const stored = () =>
            (
                db
                    .prepare("select id from adminAuditLog where targetId = 'retention-target' order by id")
                    .all() as Array<{
                    id: string;
                }>
            ).map((row) => row.id);

        expect(await ids()).toEqual(['retention-recent']);
        expect(stored()).toEqual(['retention-old', 'retention-recent']);

        // Any admin action writes an entry, which prunes.
        const alice = (
            await (await get('/api/auth/admin/list-users?searchValue=alice@&searchField=email', adminCookie)).json()
        ).users[0].id;
        await fetch(`${base}/api/auth/admin/unban-user`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie: adminCookie },
            body: JSON.stringify({ userId: alice })
        });
        expect(stored()).toEqual(['retention-recent']);
    });
});

describe('custom roles', () => {
    // The playground's moderator: user list, get, update and ban; session list and revoke.
    let moderatorCookie: string;
    let carolId: string;
    const post = (path: string, body: unknown, cookie: string) =>
        fetch(`${base}/api/auth${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie },
            body: JSON.stringify(body)
        });

    beforeAll(async () => {
        await signIn('dave', 'sign-up');
        const daveId = (
            await (await get('/api/auth/admin/list-users?searchValue=dave@&searchField=email', adminCookie)).json()
        ).users[0].id;
        expect((await post('/admin/set-role', { userId: daveId, role: 'moderator' }, adminCookie)).status).toBe(200);
        // The playground requires moderators to use two-factor.
        ({ cookie: moderatorCookie } = await setUpTwoFactor(await signIn('dave', 'sign-in'), 'password123'));
        const created = await post(
            '/admin/create-user',
            { name: 'Carol', email: 'carol@roles.test', password: 'password123', role: 'user' },
            adminCookie
        );
        carolId = (await created.json()).user.id;
    });

    it('opens the admin pages to moderators, not users', async () => {
        expect((await get('/admin/users', moderatorCookie)).status).toBe(200);
        expect((await get('/admin/users', userCookie)).status).not.toBe(200);
    });

    it('lets a moderator do what the role allows', async () => {
        expect((await get('/api/auth/admin/list-users', moderatorCookie)).status).toBe(200);
        expect((await post('/admin/ban-user', { userId: carolId }, moderatorCookie)).status).toBe(200);
        expect((await post('/admin/unban-user', { userId: carolId }, moderatorCookie)).status).toBe(200);
        expect(
            (await post('/admin/update-user', { userId: carolId, data: { name: 'Carol B' } }, moderatorCookie)).status
        ).toBe(200);
        expect((await get(`/api/_better-auth-ui/users/${carolId}/accounts`, moderatorCookie)).status).toBe(200);
    });

    it("refuses what it doesn't", async () => {
        expect((await post('/admin/remove-user', { userId: carolId }, moderatorCookie)).status).toBe(403);
        expect((await post('/admin/set-role', { userId: carolId, role: 'admin' }, moderatorCookie)).status).toBe(403);
        expect(
            (await post('/admin/set-user-password', { userId: carolId, newPassword: 'password456' }, moderatorCookie))
                .status
        ).toBe(403);
        // Changing an email takes set-email.
        expect(
            (await post('/admin/update-user', { userId: carolId, data: { email: 'c@roles.test' } }, moderatorCookie))
                .status
        ).toBe(403);
        expect(
            (
                await post(
                    '/admin/create-user',
                    { name: 'X', email: 'x@roles.test', password: 'password123' },
                    moderatorCookie
                )
            ).status
        ).toBe(403);
    });

    it('only accepts configured roles', async () => {
        expect((await post('/admin/set-role', { userId: carolId, role: 'moderator' }, adminCookie)).status).toBe(200);
        expect((await post('/admin/set-role', { userId: carolId, role: 'wizard' }, adminCookie)).status).toBe(400);
        await post('/admin/set-role', { userId: carolId, role: 'user' }, adminCookie);
    });

    it("lets the admin impersonate a moderator: only admins need impersonate-admins (Better Auth's default)", async () => {
        const daveId = (await (await get('/api/auth/get-session', moderatorCookie)).json()).user.id;
        expect((await post('/admin/impersonate-user', { userId: daveId }, adminCookie)).status).toBe(200);
    });
});

describe('resending verification emails', () => {
    const resend = (userId: string, cookie = adminCookie) =>
        fetch(`${base}/api/_better-auth-ui/users/${userId}/send-verification`, {
            method: 'POST',
            headers: { origin: base, cookie }
        });
    const outbox = async () =>
        (await (await get('/api/_playground/outbox')).json()) as Array<{
            to: string;
            subject: string;
            html?: string;
            text: string;
        }>;

    it('emails an unverified user a new link, through the app', async () => {
        const created = await fetch(`${base}/api/auth/admin/create-user`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie: adminCookie },
            body: JSON.stringify({ name: 'Fay', email: 'fay@verify.test', password: 'password123' })
        });
        const fayId = (await created.json()).user.id;
        expect((await resend(fayId)).status).toBe(200);
        // Sent in the background, as Better Auth's docs advise.
        await new Promise((resolve) => setTimeout(resolve, 300));
        // The playground's template for this email, delivered through its sender.
        expect((await outbox())[0]).toMatchObject({
            to: 'fay@verify.test',
            email: 'verify-email',
            subject: 'Welcome to the playground: verify your email'
        });
        expect((await outbox())[0]!.html).toContain('Hi Fay, welcome!');
        expect((await outbox())[0]!.text).toContain('/api/auth/verify-email?token=');
        const { entries } = await (await get(`/api/_better-auth-ui/audit?limit=1&userId=${fayId}`, adminCookie)).json();
        expect(entries[0].action).toBe('user.send-verification');
    });

    it('refuses verified users and users without the permission', async () => {
        const bob = (await (await get('/api/auth/get-session', adminCookie)).json()).user;
        await fetch(`${base}/api/auth/admin/update-user`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie: adminCookie },
            body: JSON.stringify({ userId: bob.id, data: { emailVerified: true } })
        });
        expect((await resend(bob.id)).status).toBe(400);
        expect((await resend(bob.id, userCookie)).status).toBe(403);
    });
});

describe('emails without a template', () => {
    it('sends the plain-text default through the app sender', async () => {
        const response = await fetch(`${base}/api/auth/request-password-reset`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base },
            body: JSON.stringify({ email: 'bob@example.com', redirectTo: '/reset' })
        });
        expect(response.status).toBe(200);
        // Sent in the background, as Better Auth's docs advise.
        await new Promise((resolve) => setTimeout(resolve, 300));
        const [email] = await (await get('/api/_playground/outbox')).json();
        expect(email).toMatchObject({ to: 'bob@example.com', email: 'reset-password', subject: 'Reset your password' });
        expect(email.html).toBeUndefined();
        expect(email.text).toMatch(/Hi bob,\n\nSomeone asked to reset your password/);
    });
});

describe("users' own activity", () => {
    type Entry = {
        action: string;
        actorEmail: string;
        targetEmail: string | null;
        details: Record<string, unknown> | null;
    };
    const events = async (email: string) => {
        const { entries } = await (await get('/api/_better-auth-ui/audit?limit=100', adminCookie)).json();
        return (entries as Entry[]).filter((entry) => entry.targetEmail === email && entry.action.startsWith('auth.'));
    };
    const settle = () => new Promise((resolve) => setTimeout(resolve, 300));
    const signInAs = (email: string, password: string) =>
        fetch(`${base}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base },
            body: JSON.stringify({ email, password })
        });

    it('records sign-ups, sign-ins with their method, and sign-outs', async () => {
        const cookie = await signIn('gina', 'sign-up');
        const signedOut = await fetch(`${base}/api/auth/sign-out`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie },
            body: '{}'
        });
        expect(signedOut.status).toBe(200);
        await signIn('gina', 'sign-in');
        const actions = (await events('gina@example.com')).map((entry) => [
            entry.action,
            entry.details?.method ?? null
        ]);
        expect(actions).toEqual([
            ['auth.sign-in', 'email'],
            ['auth.sign-out', null],
            ['auth.sign-up', 'email']
        ]);
        const [latest] = await events('gina@example.com');
        expect(latest!.actorEmail).toBe('gina@example.com');
    });

    it('records failed sign-ins for real accounts only', async () => {
        expect((await signInAs('gina@example.com', 'wrong-password')).status).toBe(401);
        expect((await signInAs('nobody@nowhere.test', 'wrong-password')).status).toBe(401);
        await settle();
        const [failed] = await events('gina@example.com');
        expect(failed).toMatchObject({
            action: 'auth.sign-in-failed',
            details: { reason: 'INVALID_EMAIL_OR_PASSWORD' }
        });
        expect(await events('nobody@nowhere.test')).toEqual([]);
    });

    it('records password reset requests', async () => {
        await fetch(`${base}/api/auth/request-password-reset`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base },
            body: JSON.stringify({ email: 'gina@example.com', redirectTo: '/reset' })
        });
        await settle();
        expect((await events('gina@example.com'))[0]!.action).toBe('auth.password-reset-requested');
    });

    it('records password changes', async () => {
        const cookie = await signIn('gina', 'sign-in');
        const response = await fetch(`${base}/api/auth/change-password`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie },
            body: JSON.stringify({ currentPassword: 'password123', newPassword: 'password123' })
        });
        expect(response.status).toBe(200);
        expect((await events('gina@example.com'))[0]!.action).toBe('auth.password-changed');
    });
});

describe('last sign-in', () => {
    it('comes from the latest sign-in event, and is null for users who have none', async () => {
        const idOf = async (name: string) =>
            (await (await get(`/api/auth/admin/list-users?searchValue=${name}@&searchField=email`, adminCookie)).json())
                .users[0].id;
        const [gina, carol] = [await idOf('gina'), 'no-such-user'];
        const latest = await (
            await get(`/api/_better-auth-ui/last-sign-in?userIds=${gina},${carol}`, adminCookie)
        ).json();
        expect(Date.now() - new Date(latest[gina]).getTime()).toBeLessThan(60_000);
        expect(latest[carol]).toBeNull();
        expect((await get(`/api/_better-auth-ui/last-sign-in?userIds=${gina}`, userCookie)).status).toBe(403);
    });
});

describe('the sessions page', () => {
    type Listed = {
        sessions: Array<{ id: string; token: string; user: { email: string } | null; expiresAt: string }>;
        total: number;
    };
    const list = async (query = '', cookie = adminCookie) => {
        const response = await get(`/api/_better-auth-ui/sessions?${query}`, cookie);
        expect(response.status).toBe(200);
        return (await response.json()) as Listed;
    };

    it('lists unexpired sessions with their users, most recently active first', async () => {
        const own = (await (await get('/api/auth/get-session', adminCookie)).json()).session.id;
        const { sessions, total } = await list('limit=100');
        expect(total).toBe(sessions.length);
        expect(sessions.some((session) => session.id === own && session.user?.email === 'bob@example.com')).toBe(true);
        expect(sessions.every((session) => new Date(session.expiresAt).getTime() > Date.now())).toBe(true);
    });

    it('pages, keeping the total', async () => {
        const all = await list('limit=100');
        const page = await list('limit=2&offset=1');
        expect(page.total).toBe(all.total);
        expect(page.sessions.map((session) => session.id)).toEqual(
            all.sessions.slice(1, 3).map((session) => session.id)
        );
    });

    it('lets a session be signed out through Better Auth', async () => {
        const cookie = await signIn('gina', 'sign-in');
        const ginaSession = (await (await get('/api/auth/get-session', cookie)).json()).session.id;
        const { sessions } = await list('limit=100');
        const listed = sessions.find((session) => session.id === ginaSession)!;
        const revoked = await fetch(`${base}/api/auth/admin/revoke-user-session`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie: adminCookie },
            body: JSON.stringify({ sessionToken: listed.token })
        });
        expect(revoked.status).toBe(200);
        expect((await list('limit=100')).sessions.some((session) => session.id === ginaSession)).toBe(false);
    });

    it('needs the session: list permission', async () => {
        expect((await get('/api/_better-auth-ui/sessions', userCookie)).status).toBe(403);
    });
});

describe('activity tracking (opt-in; on in the playground, every minute)', () => {
    const settle = () => new Promise((resolve) => setTimeout(resolve, 300));
    const lastActiveOf = async (id: string) =>
        (await (await get(`/api/_better-auth-ui/last-active?userIds=${id}`, adminCookie)).json())[id] as string | null;

    it('records when a signed-in user was last active, at most once per interval', async () => {
        const cookie = await signIn('hal', 'sign-up');
        const hal = (await (await get('/api/auth/get-session', cookie)).json()).user.id;
        await settle();
        const first = await lastActiveOf(hal);
        expect(first).not.toBeNull();
        expect(Date.now() - new Date(first!).getTime()).toBeLessThan(10_000);

        // Another page load within the interval doesn't write again.
        await get('/api/auth/get-session', cookie);
        await settle();
        expect(await lastActiveOf(hal)).toBe(first);
    });

    it('counts who is online in the home stats', async () => {
        const now = Date.now();
        const buckets = [new Date(now - 86_400_000), new Date(now + 1000)].map((date) => date.toISOString()).join(',');
        const stats = await (await get(`/api/_better-auth-ui/stats?buckets=${buckets}`, adminCookie)).json();
        expect(stats.online).toBeGreaterThanOrEqual(1);
    });

    it('needs the user: list permission', async () => {
        expect((await get('/api/_better-auth-ui/last-active?userIds=x', userCookie)).status).toBe(403);
    });
});

describe('sign-in pages', () => {
    it("reports what the app's Better Auth set-up offers", async () => {
        const capabilities = await (await get('/api/_better-auth-ui/capabilities')).json();
        expect(capabilities).toMatchObject({
            emailAndPassword: true,
            signUp: true,
            requireEmailVerification: false,
            minPasswordLength: 8,
            resetPassword: true,
            emailVerification: true,
            socialProviders: [],
            changeEmail: true,
            changeEmailConfirmation: true,
            deleteUser: true,
            deleteUserByEmail: true
        });
        expect(capabilities.plugins).toContain('admin');
    });

    it('serves each page to signed-out visitors, rendered on the server', async () => {
        for (const [path, text] of [
            ['/login', 'Sign in'],
            ['/signup', 'Create an account'],
            ['/forgot-password', 'Forgot your password?'],
            ['/reset-password?token=abc', 'Choose a new password'],
            ['/reset-password?error=INVALID_TOKEN', 'This link doesn']
        ] as const) {
            const response = await get(path);
            expect(response.status, path).toBe(200);
            expect(await response.text(), path).toContain(text);
        }
    });

    it('sends signed-in users away from them', async () => {
        const response = await get('/login', userCookie);
        expect(response.status).toBe(302);
    });
});

describe('the account page', () => {
    it('is for signed-in users: others are sent to sign in, and back', async () => {
        const response = await get('/account');
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toMatch(/^\/login\?redirect=%2Faccount|^\/login\?redirect=\/account/);
    });

    it('renders the overview and the open tab on the server, the profile tab by default', async () => {
        const html = await (await get('/account', userCookie)).text();
        // The overview, the tabs, and the profile tab's cards.
        for (const text of [
            'Your account',
            'alice@example.com',
            'Member since',
            'Sign-in methods',
            'Security',
            'Devices',
            'Delete',
            'How you appear to others'
        ]) {
            expect(html, text).toContain(text);
        }
        // Another tab, from the URL.
        const devices = await (await get('/account?tab=devices', userCookie)).text();
        expect(devices).toContain('Where you&#39;re signed in.');
        expect(devices).not.toContain('How you appear to others');
        // An unknown tab falls back to the profile.
        expect(await (await get('/account?tab=nope', userCookie)).text()).toContain('How you appear to others');
    });
});

describe('changing a verified email', () => {
    it('asks the current address to approve first', async () => {
        const cookie = await signIn('ivy', 'sign-up');
        const ivy = (await (await get('/api/auth/get-session', cookie)).json()).user.id;
        // Verified, as if she'd opened her verification link.
        await fetch(`${base}/api/auth/admin/update-user`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie: adminCookie },
            body: JSON.stringify({ userId: ivy, data: { emailVerified: true } })
        });
        const fresh = await signIn('ivy', 'sign-in');
        const response = await fetch(`${base}/api/auth/change-email`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie: fresh },
            body: JSON.stringify({ newEmail: 'ivy-new@example.com', callbackURL: '/account' })
        });
        expect(response.status).toBe(200);
        await new Promise((resolve) => setTimeout(resolve, 300));
        const [email] = await (await get('/api/_playground/outbox')).json();
        expect(email).toMatchObject({ email: 'change-email-confirmation', to: 'ivy@example.com' });
        expect(email.text).toContain('ivy-new@example.com');
    });
});

describe('provider sign-in errors', () => {
    it('are explained on the sign-in page', async () => {
        const html = await (await get('/login?error=email_not_found')).text();
        expect(html).toContain('share an email address');
    });
});

const postAuth = (path: string, cookie: string, body: object = {}) =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });

describe('two-factor authentication (on in the playground, with email codes)', () => {
    const post = postAuth;
    const cookies = cookiesOf;

    let uri: string;
    let backupCodes: string[];

    it('reports the plugin, with email codes, and for users without a password too', async () => {
        const capabilities = await (await get('/api/_better-auth-ui/capabilities')).json();
        expect(capabilities.twoFactor).toEqual({ otp: true, allowPasswordless: true });
    });

    it('is set up from the account page: an app, confirmed with its first code', async () => {
        const cookie = await signIn('tess', 'sign-up');
        expect(await (await get('/api/_better-auth-ui/two-factor', cookie)).json()).toEqual({
            enabled: false,
            app: false,
            passkeySession: false
        });
        expect(await (await get('/account?tab=security', cookie)).text()).toContain('Two-factor authentication');

        expect((await post('/two-factor/enable', cookie, { password: 'wrong-password' })).status).toBe(400);
        const enabled = await post('/two-factor/enable', cookie, { password: 'password123' });
        ({ totpURI: uri, backupCodes } = await enabled.json());
        expect(uri).toMatch(/^otpauth:\/\/totp\/Better%20Auth%20UI%20playground:tess%40example\.com\?/);
        expect(backupCodes).toHaveLength(10);
        // Not on until the app's first code confirms it.
        expect((await (await get('/api/_better-auth-ui/two-factor', cookie)).json()).enabled).toBe(false);

        const verified = await post('/two-factor/verify-totp', cookie, { code: totp(uri) });
        expect(verified.status).toBe(200);
        // Better Auth replaces the session when two-factor turns on.
        expect(await (await get('/api/_better-auth-ui/two-factor', cookies(verified))).json()).toEqual({
            enabled: true,
            app: true,
            passkeySession: false
        });
    });

    it('asks for a code after signing in with the password, then signs in', async () => {
        const response = await fetch(`${base}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base },
            body: JSON.stringify({ email: 'tess@example.com', password: 'password123' })
        });
        expect(await response.json()).toEqual({ twoFactorRedirect: true, twoFactorMethods: ['totp', 'otp'] });
        const pending = cookies(response);
        // No session until the second step.
        expect(await (await get('/api/auth/get-session', pending)).json()).toBeNull();
        const page = await get('/two-factor?methods=totp,otp', pending);
        expect(page.status).toBe(200);
        expect(await page.text()).toContain('Enter your code');

        expect((await post('/two-factor/verify-totp', pending, { code: '000000' })).status).toBe(401);
        const verified = await post('/two-factor/verify-totp', pending, { code: totp(uri) });
        expect(verified.status).toBe(200);
        const session = await (await get('/api/auth/get-session', cookies(verified))).json();
        expect(session.user.email).toBe('tess@example.com');
    });

    it('takes a code by email, or a backup code once', async () => {
        const start = async () =>
            cookies(
                await fetch(`${base}/api/auth/sign-in/email`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json', origin: base },
                    body: JSON.stringify({ email: 'tess@example.com', password: 'password123' })
                })
            );

        const byEmail = await start();
        expect((await post('/two-factor/send-otp', byEmail)).status).toBe(200);
        await new Promise((resolve) => setTimeout(resolve, 300));
        const [email] = await (await get('/api/_playground/outbox')).json();
        expect(email).toMatchObject({ to: 'tess@example.com', email: 'two-factor-code' });
        const code = email.subject.match(/(\d{6})$/)[1];
        expect((await post('/two-factor/verify-otp', byEmail, { code })).status).toBe(200);

        const backup = await start();
        expect((await post('/two-factor/verify-backup-code', backup, { code: backupCodes[0] })).status).toBe(200);
        const again = await start();
        expect((await post('/two-factor/verify-backup-code', again, { code: backupCodes[0] })).status).toBe(401);
    });
});

describe('requiring two-factor (moderators, in the playground)', () => {
    let monaCookie: string;

    beforeAll(async () => {
        const cookie = await signIn('mona', 'sign-up');
        const monaId = (await (await get('/api/auth/get-session', cookie)).json()).user.id;
        await postAuth('/admin/set-role', adminCookie, { userId: monaId, role: 'moderator' });
        monaCookie = await signIn('mona', 'sign-in');
    });

    it('sends them to the account page to set it up', async () => {
        const response = await get('/admin/users', monaCookie);
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/account?twoFactor=required');
        // With the security tab open, flagged.
        const html = await (await get('/account', monaCookie)).text();
        expect(html).toContain('Set up two-factor authentication');
        expect(html).toContain('Action needed');
        expect(html).toContain('Your account requires a code as well when you sign in.');
        // Others aren't asked.
        expect(await (await get('/account', userCookie)).text()).not.toContain('Set up two-factor authentication');
    });

    it("refuses the app's API and Better Auth's admin endpoints until then", async () => {
        expect((await get('/api/_better-auth-ui/sessions', monaCookie)).status).toBe(403);
        expect((await get('/api/auth/admin/list-users', monaCookie)).status).toBe(403);
        // What setting it up needs still works.
        expect((await get('/api/_better-auth-ui/two-factor', monaCookie)).status).toBe(200);
        expect((await get('/api/auth/get-session', monaCookie)).status).toBe(200);
    });

    it("opens up once it's on, and then it can't be turned off", async () => {
        const { cookie } = await setUpTwoFactor(monaCookie, 'password123');
        expect((await get('/admin/users', cookie)).status).toBe(200);
        expect((await get('/api/auth/admin/list-users', cookie)).status).toBe(200);
        expect((await get('/api/_better-auth-ui/sessions', cookie)).status).toBe(200);
        expect((await postAuth('/two-factor/disable', cookie, { password: 'password123' })).status).toBe(403);
        expect(await (await get('/account?tab=security', cookie)).text()).not.toContain('Turn off');
    });
});

describe('passkeys (on in the playground)', () => {
    it('reports the plugin', async () => {
        expect((await (await get('/api/_better-auth-ui/capabilities')).json()).passkey).toBe(true);
    });

    it('offers passkey sign-in, and adding passkeys on the account page', async () => {
        const signInPage = await (await get('/login')).text();
        expect(signInPage).toContain('Sign in with a passkey');
        expect(signInPage).toContain('autocomplete="email webauthn"');
        const account = await (await get('/account?tab=security', userCookie)).text();
        expect(account).toContain('Passkeys');
        expect(account).toContain('Add a passkey');
        expect(await (await get('/api/auth/passkey/list-user-passkeys', userCookie)).json()).toEqual([]);
    });

    it('starts registering one for signed-in users only', async () => {
        const options = await get('/api/auth/passkey/generate-register-options', userCookie);
        expect(options.status).toBe(200);
        expect((await options.json()).rp).toEqual({ name: 'Better Auth UI playground', id: 'localhost' });
        expect((await get('/api/auth/passkey/generate-register-options')).status).toBe(401);
    });
});

describe('social sign-ins ask for the code too (through a mock OAuth provider)', () => {
    /** Signs in through the playground's mock provider, as a browser would; returns Better Auth's callback response. */
    const socialSignIn = async (email: string, cookie = '') => {
        const start = await postAuth('/sign-in/social', cookie, { provider: 'mock', callbackURL: '/account' });
        const { url } = await start.json();
        const authorize = await fetch(`${url}&email=${encodeURIComponent(email)}`, { redirect: 'manual' });
        return fetch(authorize.headers.get('location')!, {
            redirect: 'manual',
            headers: { cookie: [cookie, cookiesOf(start)].filter(Boolean).join('; ') }
        });
    };
    const sessionEmail = async (cookie: string) =>
        ((await (await get('/api/auth/get-session', cookie)).json()) as { user: { email: string } } | null)?.user
            .email ?? null;

    let uri: string;

    it('signs in users without two-factor straight away', async () => {
        const callback = await socialSignIn('sol@mock.test');
        expect(callback.status).toBe(302);
        expect(callback.headers.get('location')).toBe('/account');
        const cookie = cookiesOf(callback);
        expect(await sessionEmail(cookie)).toBe('sol@mock.test');
        // No password: two-factor goes on without one.
        ({ uri } = await setUpTwoFactor(cookie));
    });

    it('sends users with it on to the code page instead, without a session, then on', async () => {
        const callback = await socialSignIn('sol@mock.test');
        expect(callback.status).toBe(302);
        expect(callback.headers.get('location')).toBe('/two-factor?redirect=%2Faccount&methods=totp%2Cotp');
        const pending = cookiesOf(callback);
        expect(await sessionEmail(pending)).toBeNull();

        const verified = await postAuth('/two-factor/verify-totp', pending, { code: totp(uri), trustDevice: true });
        expect(verified.status).toBe(200);
        expect(await sessionEmail(cookiesOf(verified))).toBe('sol@mock.test');

        // A trusted device isn't asked again.
        const trust = cookiesOf(verified)
            .split('; ')
            .filter((cookie) => cookie.includes('trust_device'))
            .join('; ');
        expect(trust).not.toBe('');
        const trusted = await socialSignIn('sol@mock.test', trust);
        expect(trusted.headers.get('location')).toBe('/account');
        expect(await sessionEmail(cookiesOf(trusted))).toBe('sol@mock.test');
    });
});
