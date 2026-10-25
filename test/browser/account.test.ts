import { describe, expect, it } from 'vitest';

import { totp, waitForEmail } from '../helpers';
import { hasBrowser, signInWithForm, signUp, useBrowser } from './browser';

// The account page in a real browser: its tabs, two-factor and passkeys end to end, and hydration on every tab.
describe.skipIf(!hasBrowser)('account page (browser)', () => {
    const browser = useBrowser();

    it('shows the overview and tabs, which open from the tiles and the URL, cleanly', async () => {
        await signUp('Tabby', 'tabby@browser.test');
        const session = await browser.open();
        await signInWithForm(session, 'tabby@browser.test', '/account');
        for (const tab of ['profile', 'security', 'devices', 'delete']) {
            await session.go(`/account?tab=${tab}`);
            await expect(session.page.getByRole('tab', { selected: true }).count(), tab).resolves.toBe(1);
        }
        expect(session.problems).toEqual([]);

        await session.go('/account');
        await session.page.getByRole('button', { name: /Two-factor/ }).click();
        await session.page.waitForURL((url) => url.searchParams.get('tab') === 'security');

        // A phone: no sideways scrolling.
        await session.page.setViewportSize({ width: 390, height: 900 });
        await session.go('/account');
        await expect(
            session.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        ).resolves.toBe(false);
    });

    it('sets up two-factor with an app, then asks for its code at sign-in', async () => {
        await signUp('Otto', 'otto@browser.test');
        const session = await browser.open();
        await signInWithForm(session, 'otto@browser.test', '/account');
        await session.go('/account?tab=security');
        await session.page.getByRole('button', { name: 'Set up an authenticator app' }).click();
        await session.page.getByLabel('Your password').fill('password123');
        await session.page.getByRole('button', { name: 'Continue' }).click();
        await session.page.getByText('Scan this with your authenticator app').waitFor();
        const secret = (await session.page.locator('code').first().textContent())!.trim();
        await expect(session.page.locator('.bg-white svg').count()).resolves.toBe(1);
        await session.page.locator('[aria-label="Code"] input').first().click();
        await session.page.keyboard.type(totp(secret));
        await session.page.getByText('Save your backup codes').waitFor({ timeout: 10_000 });
        await expect(session.page.locator('ul.grid li').count()).resolves.toBe(10);

        const again = await browser.open();
        await again.noPasskeyAutofill();
        await again.go('/login?redirect=/account');
        await again.page.getByLabel(/^Email/).fill('otto@browser.test');
        await again.page.getByLabel('Password', { exact: true }).fill('password123');
        await again.page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await again.page.waitForURL((url) => url.pathname === '/two-factor', { timeout: 10_000 });
        await again.page.locator('[aria-label="Code"] input').first().click();
        await again.page.keyboard.type(totp(secret));
        await again.page.waitForURL((url) => url.pathname === '/account', { timeout: 10_000 });
        expect(again.problems).toEqual([]);
    });

    it('adds a passkey, signs in with it, and explains a closed prompt', async () => {
        await signUp('Pip', 'pip@browser.test');
        const session = await browser.open();
        // A virtual authenticator: Chromium answers passkey prompts itself.
        const cdp = await session.context.newCDPSession(session.page);
        await cdp.send('WebAuthn.enable');
        await cdp.send('WebAuthn.addVirtualAuthenticator', {
            options: {
                protocol: 'ctap2',
                transport: 'internal',
                hasResidentKey: true,
                hasUserVerification: true,
                isUserVerified: true,
                automaticPresenceSimulation: true
            }
        });
        await signInWithForm(session, 'pip@browser.test', '/account');
        await session.go('/account?tab=security');
        await session.page.getByPlaceholder(/Name it/).fill('Test key');
        await session.page.getByRole('button', { name: 'Add a passkey' }).click();
        await session.page.getByText('Test key', { exact: true }).waitFor({ timeout: 10_000 });
        expect((await waitForEmail('pip@browser.test', 'passkey-added')).text).toContain('"Test key"');

        await session.context.clearCookies();
        await session.go('/login?redirect=/account');
        await session.page.getByRole('button', { name: 'Sign in with a passkey' }).click();
        await session.page.waitForURL((url) => url.pathname === '/account', { timeout: 10_000 });

        // A closed (or timed-out) prompt, as the browser reports it.
        const cancelled = await browser.open();
        await cancelled.context.addInitScript(() => {
            const reject = () =>
                Promise.reject(
                    new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError')
                );
            navigator.credentials.create = reject;
            navigator.credentials.get = reject;
        });
        await signInWithForm(cancelled, 'pip@browser.test', '/account');
        await cancelled.go('/account?tab=security');
        await cancelled.page.getByRole('button', { name: 'Add a passkey' }).click();
        await cancelled.page.getByText('No passkey was added: the prompt was closed or timed out.').waitFor();
    });
});
