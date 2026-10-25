import { describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath, totp } from './helpers';

// "Download my data" (the account page's export), against the built server.
const post = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const exportFor = (cookie: string) => fetch(`${base}/api/_better-auth-ui/export`, { headers: { cookie } });

describe('data export', () => {
    it('needs a session', async () => {
        expect((await exportFor('')).status).toBe(401);
    });

    it('downloads what the auth keeps about them, without secrets', async () => {
        const signUp = await post('/sign-up/email', {
            name: 'Dana',
            email: 'dana@export.test',
            password: 'password123'
        });
        expect(signUp.status).toBe(200);

        // An admin bans then unbans them (which signs them out): their history says an admin did, not which one.
        await post('/sign-up/email', { name: 'Exporter Admin', email: 'boss@export.test', password: 'password123' });
        new Database(databasePath).prepare("update user set role = 'admin' where email = 'boss@export.test'").run();
        const adminCookie = cookiesOf(
            await post('/sign-in/email', { email: 'boss@export.test', password: 'password123' })
        );
        const userId = (
            new Database(databasePath).prepare('select id from user where email = ?').get('dana@export.test') as {
                id: string;
            }
        ).id;
        expect((await post('/admin/ban-user', { userId, banReason: 'Testing' }, adminCookie)).status).toBe(200);
        expect((await post('/admin/unban-user', { userId }, adminCookie)).status).toBe(200);

        let cookie = cookiesOf(await post('/sign-in/email', { email: 'dana@export.test', password: 'password123' }));
        const { totpURI } = await (await post('/two-factor/enable', { password: 'password123' }, cookie)).json();
        cookie = cookiesOf(await post('/two-factor/verify-totp', { code: totp(totpURI) }, cookie));

        const response = await exportFor(cookie);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-disposition')).toBe('attachment; filename="account-data.json"');
        const text = await response.text();
        const data = JSON.parse(text);

        expect(data.user).toMatchObject({ email: 'dana@export.test', name: 'Dana', twoFactorEnabled: true });
        expect(data.signInMethods).toEqual([expect.objectContaining({ provider: 'credential' })]);
        expect(data.sessions.some((session: { current: boolean }) => session.current)).toBe(true);
        expect(data.twoFactor).toEqual({ enabled: true });

        const actions = data.history.map((entry: { action: string; by: string }) => `${entry.by}: ${entry.action}`);
        expect(actions).toContain('an admin: user.ban');
        const ban = data.history.find((entry: { action: string }) => entry.action === 'user.ban');
        expect(ban).not.toHaveProperty('ipAddress');
        expect(text).not.toContain('boss@export.test');

        // No password hash, session tokens or two-factor secret.
        const secret = new URL(totpURI).searchParams.get('secret')!;
        expect(text).not.toContain(secret);
        expect(text).not.toMatch(/"(password|token|accessToken|refreshToken|secret|backupCodes|publicKey)"/);
        const hash = (
            new Database(databasePath)
                .prepare("select password from account where userId = ? and providerId = 'credential'")
                .get(userId) as { password: string }
        ).password;
        expect(text).not.toContain(hash);
    });
});
