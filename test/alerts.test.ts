import { describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath, outbox, totp, waitForEmail } from './helpers';

// Security alerts (betterAuthUi.securityAlerts, on in the playground), against the built server.
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';
const CHROME =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const post = (path: string, body: unknown, { cookie = '', agent = FIREFOX } = {}) =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, 'user-agent': agent, cookie },
        body: JSON.stringify(body)
    });
const alertsTo = async (email: string, kind: string) =>
    (await outbox()).filter((message) => message.to === email && message.email === kind);

/** An account that's been around a while: new accounts don't get new-device alerts. */
async function account(name: string, email: string) {
    const signUp = await post('/sign-up/email', { name, email, password: 'password123' });
    expect(signUp.status).toBe(200);
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    new Database(databasePath).prepare('update user set createdAt = ? where email = ?').run(hourAgo, email);
    return cookiesOf(signUp);
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 500));

describe('security alerts', () => {
    it('emails a sign-in from a new device, once, and not from a known one', async () => {
        await account('Alba', 'alba@alerts.test');
        expect((await post('/sign-in/email', { email: 'alba@alerts.test', password: 'password123' })).status).toBe(200);
        await settle();
        expect(await alertsTo('alba@alerts.test', 'new-sign-in')).toHaveLength(0);

        await post('/sign-in/email', { email: 'alba@alerts.test', password: 'password123' }, { agent: CHROME });
        const alert = await waitForEmail('alba@alerts.test', 'new-sign-in');
        expect(alert.subject).toBe('New sign-in from Chrome on Windows');
        expect(alert.text).toContain(`${base}/account?tab=devices`);

        await post('/sign-in/email', { email: 'alba@alerts.test', password: 'password123' }, { agent: CHROME });
        await settle();
        expect(await alertsTo('alba@alerts.test', 'new-sign-in')).toHaveLength(1);
    });

    it("doesn't alert a brand-new account's first sign-ins", async () => {
        await post('/sign-up/email', { name: 'Neo', email: 'neo@alerts.test', password: 'password123' });
        await post('/sign-in/email', { email: 'neo@alerts.test', password: 'password123' }, { agent: CHROME });
        await settle();
        expect(await alertsTo('neo@alerts.test', 'new-sign-in')).toHaveLength(0);
    });

    it('emails a password change', async () => {
        const cookie = await account('Pau', 'pau@alerts.test');
        const changed = await post(
            '/change-password',
            { currentPassword: 'password123', newPassword: 'password456' },
            { cookie }
        );
        expect(changed.status).toBe(200);
        const alert = await waitForEmail('pau@alerts.test', 'password-changed');
        expect(alert.subject).toBe('Your password was changed');
        expect(alert.text).toContain(`${base}/account?tab=security`);
    });

    it('emails two-factor turned on and off, and alerts the sign-in after its code', async () => {
        const cookie = await account('Tess', 'tess@alerts.test');
        const { totpURI } = await (await post('/two-factor/enable', { password: 'password123' }, { cookie })).json();
        expect((await post('/two-factor/verify-totp', { code: totp(totpURI) }, { cookie })).status).toBe(200);
        expect((await waitForEmail('tess@alerts.test', 'two-factor-changed')).subject).toBe(
            'Two-factor authentication is on'
        );

        // From a new device: the password alone makes no session, so no alert until the code.
        const signIn = await post(
            '/sign-in/email',
            { email: 'tess@alerts.test', password: 'password123' },
            { agent: CHROME }
        );
        expect((await signIn.json()).twoFactorRedirect).toBe(true);
        await settle();
        expect(await alertsTo('tess@alerts.test', 'new-sign-in')).toHaveLength(0);
        const verified = await post(
            '/two-factor/verify-totp',
            { code: totp(totpURI) },
            { cookie: cookiesOf(signIn), agent: CHROME }
        );
        expect(verified.status).toBe(200);
        expect((await waitForEmail('tess@alerts.test', 'new-sign-in')).subject).toBe(
            'New sign-in from Chrome on Windows'
        );

        // From the new session: turning two-factor on replaced the first one.
        const disabled = await post(
            '/two-factor/disable',
            { password: 'password123' },
            { cookie: cookiesOf(verified), agent: CHROME }
        );
        expect(disabled.status).toBe(200);
        await settle();
        const twoFactor = await alertsTo('tess@alerts.test', 'two-factor-changed');
        expect(twoFactor.map((message) => message.subject)).toEqual([
            'Two-factor authentication was turned off',
            'Two-factor authentication is on'
        ]);
    });
});
