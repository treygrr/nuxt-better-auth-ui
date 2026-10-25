import { describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath } from './helpers';

// Stripe subscriptions (betterAuthUi.stripe, on in the playground with made-up prices), against the built server.
// Nothing here reaches Stripe: a subscription is written as its webhook would leave it.
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const get = (path: string, cookie: string) => fetch(`${base}${path}`, { headers: { cookie } });

describe('Stripe subscriptions', () => {
    it("show the plans and the user's subscription, on their billing tab and in the admin", async () => {
        const capabilities = await (await fetch(`${base}/api/_better-auth-ui/capabilities`)).json();
        expect(capabilities.stripe).toBe(true);

        await auth('/sign-up/email', { name: 'Penny', email: 'penny@stripe.test', password: 'password123' });
        const cookie = cookiesOf(await auth('/sign-in/email', { email: 'penny@stripe.test', password: 'password123' }));
        await auth('/sign-up/email', { name: 'Billing Admin', email: 'admin@stripe.test', password: 'password123' });
        const db = new Database(databasePath);
        db.prepare("update user set role = 'admin' where email = 'admin@stripe.test'").run();
        const adminCookie = cookiesOf(
            await auth('/sign-in/email', { email: 'admin@stripe.test', password: 'password123' })
        );
        const { id: userId } = db.prepare('select id from user where email = ?').get('penny@stripe.test') as {
            id: string;
        };

        expect(await (await get('/api/auth/subscription/list', cookie)).json()).toEqual([]);
        const tab = await (await get('/account?tab=billing', cookie)).text();
        expect(tab).toContain('Basic');
        expect(tab).toContain('14-day free trial');

        const periodEnd = Date.now() + 30 * 86_400_000;
        db.prepare(
            "insert into subscription (id, plan, referenceId, status, periodEnd, cancelAtPeriodEnd) values ('sub_test', 'pro', ?, 'active', ?, 0)"
        ).run(userId, periodEnd);

        const listed = await (await get('/api/auth/subscription/list', cookie)).json();
        expect(listed).toEqual([expect.objectContaining({ plan: 'pro', status: 'active' })]);
        expect(await (await get('/account?tab=billing', cookie)).text()).toContain('Renews on');

        expect((await get(`/api/_better-auth-ui/users/${userId}/subscriptions`, cookie)).status).toBe(403);
        const admin = await (await get(`/api/_better-auth-ui/users/${userId}/subscriptions`, adminCookie)).json();
        expect(admin).toEqual([expect.objectContaining({ plan: 'pro', status: 'active', cancelAtPeriodEnd: false })]);
        expect(JSON.stringify(admin)).not.toContain('stripe');
    });
});
