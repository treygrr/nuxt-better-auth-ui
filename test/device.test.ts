import { beforeAll, describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath } from './helpers';

// Device Authorization (betterAuthUi.deviceAuthorization, on in the playground with one client), against the built
// server. Better Auth allows 5 code checks (GET /device) per window, so these use few.
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const newCode = async () => {
    const response = await auth('/device/code', { client_id: 'playground-tv' });
    expect(response.status).toBe(200);
    return (await response.json()) as { device_code: string; user_code: string; verification_uri: string };
};
const poll = (deviceCode: string) =>
    auth('/device/token', {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
        client_id: 'playground-tv'
    });

let cookie: string;
let userId: string;
beforeAll(async () => {
    await auth('/sign-up/email', { name: 'Tess', email: 'tess@device.test', password: 'password123' });
    cookie = cookiesOf(await auth('/sign-in/email', { email: 'tess@device.test', password: 'password123' }));
    userId = (
        new Database(databasePath).prepare('select id from user where email = ?').get('tess@device.test') as {
            id: string;
        }
    ).id;
});

describe('device sign-in', () => {
    it('only gives codes to the listed apps, pointing at the module page', async () => {
        expect((await auth('/device/code', { client_id: 'someone-else' })).status).toBe(400);
        const { verification_uri } = await newCode();
        expect(new URL(verification_uri, base).pathname).toBe('/device');
    });

    it('sends signed-out visitors to sign in first, keeping the code', async () => {
        const response = await fetch(`${base}/device?user_code=ABCD1234`, { redirect: 'manual' });
        expect(response.status).toBe(302);
        expect(decodeURIComponent(response.headers.get('location')!)).toContain('/device?user_code=ABCD1234');
    });

    it('signs the device in once the user approves on the page', async () => {
        const { device_code, user_code } = await newCode();
        // The page checks the code while rendering, which claims it for this session.
        const page = await fetch(`${base}/device?user_code=${user_code}`, { headers: { cookie } });
        expect(page.status).toBe(200);
        expect(await page.text()).toContain('Playground TV');

        // Polled once: Better Auth asks devices to wait its interval (5 seconds) between polls.
        expect((await auth('/device/approve', { userCode: user_code }, cookie)).status).toBe(200);
        const token = await poll(device_code);
        expect(token.status).toBe(200);
        expect((await token.json()).access_token).toEqual(expect.any(String));

        const approved = new Database(databasePath)
            .prepare(
                "select count(*) as count from adminAuditLog where action = 'auth.device-approved' and actorId = ?"
            )
            .get(userId) as { count: number };
        expect(approved.count).toBe(1);
    });

    it("doesn't sign the device in when the user denies it", async () => {
        const { device_code, user_code } = await newCode();
        expect((await fetch(`${base}/api/auth/device?user_code=${user_code}`, { headers: { cookie } })).status).toBe(
            200
        );
        expect((await auth('/device/deny', { userCode: user_code }, cookie)).status).toBe(200);
        expect((await (await poll(device_code)).json()).error).toBe('access_denied');
    });
});
