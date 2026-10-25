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
        for (const tab of ['profile', 'security', 'devices', 'organizations', 'billing', 'api-keys', 'delete']) {
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

    it('creates an organization, makes it active and opens it', async () => {
        await signUp('Orla', 'orla@browser.test');
        const session = await browser.open();
        await signInWithForm(session, 'orla@browser.test', '/account');
        await session.go('/account?tab=organizations');
        await session.page.getByRole('button', { name: 'Create organization' }).click();
        const dialog = session.page.getByRole('dialog');
        await dialog.getByLabel('Name').fill('Orla & Co');
        await expect(dialog.getByLabel('Slug').inputValue()).resolves.toBe('orla-co');
        // The app's own field (the playground's "website").
        await dialog.getByLabel('Website').fill('https://orla.example');
        await dialog.getByRole('button', { name: 'Create organization' }).click();
        // Toasts are matched exactly: their words are also in Nuxt UI's screen-reader announcement.
        await session.page.getByText('Created Orla & Co', { exact: true }).waitFor();
        // A new organization becomes the active one (Better Auth's create sets it).
        await session.page.getByText('Active').first().waitFor();
        expect(session.problems).toEqual([]);

        // Its own page: details, members, invitations, teams and roles.
        await session.page.getByRole('link', { name: 'Manage' }).click();
        await session.page.waitForURL((url) => url.pathname.startsWith('/organization/'), { timeout: 10_000 });
        await expect(session.page.getByLabel('Website').inputValue()).resolves.toBe('https://orla.example');
        await session.page.getByLabel('Name', { exact: true }).fill('Orla and Co');
        await session.page.getByRole('button', { name: 'Save' }).click();
        await session.page.getByText('Details saved', { exact: true }).waitFor();

        await session.page.getByRole('tab', { name: 'Members' }).click();
        await session.page.getByText('Members (1)').waitFor();

        await session.page.getByRole('tab', { name: 'Invitations' }).click();
        await session.page.getByLabel('Their email').fill('guest@orla.test');
        await session.page.getByRole('button', { name: 'Send invitation' }).click();
        await session.page.getByText('Invited guest@orla.test', { exact: true }).waitFor();
        await session.page.getByText('Waiting for an answer').waitFor();

        await session.page.getByRole('tab', { name: 'Teams' }).click();
        await session.page.getByLabel('Name').fill('Design');
        await session.page.getByRole('button', { name: 'Create team' }).click();
        await session.page.getByText('Created Design', { exact: true }).waitFor();

        await session.page.getByRole('tab', { name: 'Roles' }).click();
        await session.page.getByText('Editor').first().waitFor();
        await session.page.getByRole('button', { name: 'Create role' }).click();
        await session.page.getByRole('dialog').getByLabel('Name').fill('reviewer');
        await session.page.getByRole('dialog').getByRole('checkbox', { name: 'update' }).first().check();
        await session.page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
        await session.page.getByText('Created reviewer', { exact: true }).waitFor();
        expect(session.problems).toEqual([]);

        // The switcher an app shows: the active organization, and its teams to switch to.
        await session.go('/');
        await session.page.getByRole('button', { name: 'Orla and Co' }).click();
        // Their teams: Better Auth's default one, named after the organization when it was created.
        await session.page.getByRole('menuitem', { name: 'Orla & Co' }).click();
        await session.page.getByRole('button', { name: 'Orla and Co' }).click();
        await expect(session.page.getByRole('menu').innerText()).resolves.toContain('Manage organization');
        expect(session.problems).toEqual([]);
    });

    it('creates an API key, shows it once, and revokes it', async () => {
        await signUp('Kai', 'kai@browser.test');
        const session = await browser.open();
        await signInWithForm(session, 'kai@browser.test', '/account');
        await session.go('/account?tab=api-keys');
        await session.page.getByRole('button', { name: 'Create key' }).click();
        await session.page.getByLabel('Name').fill('Deploy script');
        await session.page.getByLabel('projects:write').check();
        await session.page.getByRole('dialog').getByRole('button', { name: 'Create key' }).click();
        await session.page.getByText('Copy your new key').waitFor();
        await expect(session.page.getByRole('dialog').getByRole('textbox').inputValue()).resolves.toMatch(/^pg_/);
        await session.page.getByRole('button', { name: 'Done' }).click();

        await session.page.getByText('projects:write').waitFor();
        await session.page.getByRole('button', { name: 'Revoke' }).click();
        await session.page.getByRole('dialog').getByRole('button', { name: 'Revoke' }).click();
        await session.page.getByText('No API keys yet.').waitFor();
        expect(session.problems).toEqual([]);
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
        await session.page.getByRole('button', { name: 'Passkey', exact: true }).click();
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
