import { execSync, spawn, type ChildProcess } from 'node:child_process';
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
const dataDir = mkdtempSync(join(tmpdir(), 'better-auth-admin-'));
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
            NUXT_PUBLIC_SITE_URL: base
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
        expect(html).toContain('Overview');
        expect(html).toContain('Back to site');
        expect((await get('/admin/users', adminCookie)).status).toBe(200);
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
