import { describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath } from './helpers';

// Stripe Checkout and the billing portal against Stripe's test mode, for real. Skipped unless the environment has a
// test-mode key and your own test prices:
//
//   STRIPE_SECRET_KEY=sk_test_… PLAYGROUND_STRIPE_PRICE_BASIC=price_… PLAYGROUND_STRIPE_PRICE_PRO=price_… \
//   PLAYGROUND_STRIPE_PRICE_PRO_YEARLY=price_… pnpm test test/stripe-live.test.ts
//
// The billing portal needs its settings saved once in Stripe's dashboard (Settings → Billing → Customer portal).
const key = process.env.STRIPE_SECRET_KEY ?? '';
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });

describe.skipIf(!key.startsWith('sk_test_') || !process.env.PLAYGROUND_STRIPE_PRICE_BASIC)("Stripe's test mode", () => {
    let cookie: string;

    it('starts Checkout for a plan, with a Stripe customer for the user', async () => {
        await auth('/sign-up/email', { name: 'Stella', email: 'stella@stripe-live.test', password: 'password123' });
        cookie = cookiesOf(await auth('/sign-in/email', { email: 'stella@stripe-live.test', password: 'password123' }));
        const upgrade = await auth(
            '/subscription/upgrade',
            { plan: 'basic', successUrl: '/account?tab=billing', cancelUrl: '/account?tab=billing' },
            cookie
        );
        expect(upgrade.status, await upgrade.clone().text()).toBe(200);
        const { url } = (await upgrade.json()) as { url: string };
        expect(url).toMatch(/^https:\/\/checkout\.stripe\.com\//);

        const { stripeCustomerId } = new Database(databasePath)
            .prepare('select stripeCustomerId from user where email = ?')
            .get('stella@stripe-live.test') as { stripeCustomerId: string | null };
        expect(stripeCustomerId).toMatch(/^cus_/);
    });

    it('opens the billing portal', async () => {
        const portal = await auth('/subscription/billing-portal', { returnUrl: '/account?tab=billing' }, cookie);
        expect(portal.status, await portal.clone().text()).toBe(200);
        expect(((await portal.json()) as { url: string }).url).toMatch(/^https:\/\/billing\.stripe\.com\//);
    });
});
