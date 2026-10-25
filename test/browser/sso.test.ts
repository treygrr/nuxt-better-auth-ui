import { describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath } from '../helpers';
import { hasBrowser, signInWithForm, signUp, useBrowser } from './browser';

// Single sign-on in a real browser: an owner adds an identity provider from the organization's SSO tab, then someone
// signs in with "Sign in with SSO" through the playground's mock identity provider.
describe.skipIf(!hasBrowser)('single sign-on (browser)', () => {
    const browser = useBrowser();

    it("is set up from the organization's SSO tab, then signs people in by their work email", async () => {
        await signUp('Hana', 'hana@browser.test');
        const cookie = cookiesOf(
            await fetch(`${base}/api/auth/sign-in/email`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', origin: base },
                body: JSON.stringify({ email: 'hana@browser.test', password: 'password123' })
            })
        );
        const created = await fetch(`${base}/api/auth/organization/create`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie },
            body: JSON.stringify({ name: 'Hooli', slug: 'hooli' })
        });
        const { id } = await created.json();

        const owner = await browser.open();
        await signInWithForm(owner, 'hana@browser.test', `/organization/${id}`);
        await owner.page.getByRole('tab', { name: 'SSO' }).click();
        await owner.page.getByRole('button', { name: 'Add provider' }).click();
        const dialog = owner.page.getByRole('dialog');
        await dialog.getByLabel('Provider ID').fill('hooli-oidc');
        await dialog.getByLabel('Email domains').fill('hooli.test');
        await dialog.getByLabel('Issuer').fill(`${base}/api/_playground/oidc`);
        await dialog.getByLabel('Client ID').fill('hooli-client');
        await dialog.getByLabel('Client secret').fill('hooli-secret');
        await dialog.getByRole('button', { name: 'Add provider' }).click();
        await owner.page.getByText('Added hooli-oidc', { exact: true }).waitFor();
        // What to give the identity provider, and the DNS record that proves the domain is Hooli's.
        await owner.page.getByText(`${base}/api/auth/sso/callback/hooli-oidc`).waitFor();
        await owner.page.getByText('_better-auth-token-hooli-oidc.hooli.test').waitFor();
        await owner.page.getByText('Domain not verified').waitFor();
        expect(owner.problems).toEqual([]);

        // As if the TXT record had been found.
        new Database(databasePath)
            .prepare("update ssoProvider set domainVerified = 1 where providerId = 'hooli-oidc'")
            .run();

        const visitor = await browser.open();
        await visitor.noPasskeyAutofill();
        await visitor.go('/login');
        await visitor.page.getByRole('button', { name: 'Sign in with SSO' }).click();
        await visitor.page.getByLabel('Work email or organization').fill('nobody@nowhere.test');
        await visitor.page.getByRole('button', { name: 'Continue' }).click();
        await visitor.page.getByText('No single sign-on is set up for that email or organization.').waitFor();

        await visitor.page.getByLabel('Work email or organization').fill('dev@hooli.test');
        await visitor.page.getByRole('button', { name: 'Continue' }).click();
        // A new user starts on the account page.
        await visitor.page.waitForURL((url) => url.pathname === '/account', { timeout: 10_000 });
        await visitor.page.getByText('dev@hooli.test').first().waitFor();
        expect(visitor.problems).toEqual([]);
    });
});
