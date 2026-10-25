import { describe, expect, it } from 'vitest';

import { base, linkIn, waitForEmail, waitForSms } from '../helpers';
import { hasBrowser, signInWithForm, signUp, useBrowser } from './browser';

// The sign-in pages in a real browser: the forms, hydration, and what they do next.
describe.skipIf(!hasBrowser)('sign-in pages (browser)', () => {
    const browser = useBrowser();

    it('signs up with the form, with a username, and lands signed in', async () => {
        const session = await browser.open();
        await session.go('/signup');
        expect(session.problems).toEqual([]);
        await session.page.getByLabel('Name', { exact: true }).fill('Remy');
        await session.page.getByLabel('Username', { exact: true }).fill('Remy_1');
        await session.page.getByLabel('Email', { exact: true }).fill('remy@browser.test');
        await session.page.getByLabel('Password', { exact: true }).fill('password123');
        await session.page.getByRole('button', { name: 'Create account' }).click();
        await session.page.waitForURL((url) => url.pathname === '/', { timeout: 10_000 });
        await session.go('/account');
        await expect(session.page.getByText('@Remy_1 · remy@browser.test').count()).resolves.toBe(1);
    });

    it('signs in with the username, shows wrong passwords plainly, and remembers the method', async () => {
        const session = await browser.open();
        await session.noPasskeyAutofill();
        await session.go('/login?redirect=/account');
        await session.page.getByLabel('Email or username').fill('remy_1');
        await session.page.getByLabel('Password', { exact: true }).fill('nope-nope');
        await session.page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await session.page.getByText('Wrong username or password.').waitFor();

        await session.page.getByLabel('Password', { exact: true }).fill('password123');
        await session.page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await session.page.waitForURL((url) => url.pathname === '/account', { timeout: 10_000 });

        // Signed out, the sign-in page remembers how.
        await session.context.clearCookies({ name: /session/ });
        await session.go('/login');
        await expect(session.page.getByText('Last time, you signed in with your password.').count()).resolves.toBe(1);
        expect(session.problems).toEqual([]);
    });

    it('signs in with a link by email', async () => {
        await signUp('Lina', 'lina@browser.test');
        const session = await browser.open();
        await session.noPasskeyAutofill();
        await session.go('/login?redirect=/account');
        await session.page.getByRole('button', { name: 'Email me a sign-in link' }).click();
        await session.page.getByLabel('Email', { exact: true }).fill('lina@browser.test');
        await session.page.getByRole('button', { name: 'Send link' }).click();
        await session.page.getByText('Check your email').waitFor();

        await session.page.goto(linkIn(await waitForEmail('lina@browser.test', 'magic-link')));
        await session.page.waitForURL((url) => url.pathname === '/account', { timeout: 10_000 });
    });

    it('signs in with a code by email', async () => {
        await signUp('Cody', 'cody@browser.test');
        const session = await browser.open();
        await session.noPasskeyAutofill();
        await session.go('/login?redirect=/account');
        await session.page.getByRole('button', { name: 'Email me a code' }).click();
        await session.page.getByLabel('Email', { exact: true }).fill('cody@browser.test');
        await session.page.getByRole('button', { name: 'Send code' }).click();
        await session.page.getByText('Enter your code').waitFor();

        const email = await waitForEmail('cody@browser.test', 'email-code');
        await session.page.locator('[aria-label="Code"] input').first().click();
        await session.page.keyboard.type(email.subject.match(/\d{6}$/)![0]);
        await session.page.waitForURL((url) => url.pathname === '/account', { timeout: 10_000 });
        expect(session.problems).toEqual([]);
    });

    it('signs in with a provider in a popup, staying on the page', async () => {
        const session = await browser.open();
        await session.noPasskeyAutofill();
        await session.go('/login?redirect=/account');
        const [popup] = await Promise.all([
            session.context.waitForEvent('page'),
            session.page.getByRole('button', { name: 'Continue with mock', exact: true }).click()
        ]);
        // The popup goes through the provider and closes itself; the page then moves on, signed in.
        await popup.waitForEvent('close', { timeout: 10_000 });
        await session.page.waitForURL((url) => url.pathname === '/account', { timeout: 10_000 });
        await session.page.getByText('player@mock.test').first().waitFor();
        expect(session.problems).toEqual([]);
    });

    it('sends accounts from a provider without an email to add one', async () => {
        const session = await browser.open();
        await session.noPasskeyAutofill();
        await session.go('/login?redirect=/account');
        const [popup] = await Promise.all([
            session.context.waitForEvent('page'),
            session.page.getByRole('button', { name: 'Continue with mock-no-email' }).click()
        ]);
        await popup.waitForEvent('close', { timeout: 10_000 });
        await session.page.waitForURL((url) => url.pathname === '/finish-account', { timeout: 10_000 });
        await session.page.getByLabel('Email').fill('player@finish.test');
        await session.page.getByRole('button', { name: 'Send link' }).click();
        await session.page.getByText('Check your email').waitFor();
        expect(session.problems).toEqual([]);
    });

    it('signs in with a code by text', async () => {
        const session = await browser.open();
        await session.noPasskeyAutofill();
        await session.go('/login?redirect=/account');
        await session.page.getByRole('button', { name: 'Text me a code' }).click();
        await session.page.getByLabel('Phone number').fill('+1 (555) 000-4444');
        await session.page.getByRole('button', { name: 'Send code' }).click();
        await session.page.getByText('Enter your code').waitFor();

        const { code } = await waitForSms('+15550004444');
        await session.page.locator('[aria-label="Code"] input').first().click();
        await session.page.keyboard.type(code);
        await session.page.waitForURL((url) => url.pathname === '/account', { timeout: 10_000 });
        // Better Auth names a phone sign-up after its number, so it shows as the name and on the phone card.
        await session.page.getByText('+15550004444').first().waitFor();
        expect(session.problems).toEqual([]);
    });

    it('continues as a guest, then keeps the account by signing up', async () => {
        const session = await browser.open();
        await session.noPasskeyAutofill();
        await session.go('/login?redirect=/account');
        await session.page.getByRole('button', { name: 'Continue as a guest' }).click();
        await session.page.waitForURL((url) => url.pathname === '/account', { timeout: 10_000 });
        await session.page.getByText("You're using a guest account").waitFor();
        expect(session.problems).toEqual([]);

        await session.page.getByRole('link', { name: 'Create an account' }).click();
        await session.page.waitForURL((url) => url.pathname === '/signup', { timeout: 10_000 });
        await session.page.getByText('Sign in or create an account to keep it').waitFor();
        await session.page.getByLabel('Name', { exact: true }).fill('Gwen');
        await session.page.getByLabel('Username', { exact: true }).fill('gwen_guest');
        await session.page.getByLabel('Email', { exact: true }).fill('gwen@browser.test');
        await session.page.getByLabel('Password', { exact: true }).fill('password123');
        await session.page.getByRole('button', { name: 'Create account' }).click();
        await session.page.waitForURL((url) => url.pathname === '/account', { timeout: 10_000 });
        await session.page.getByText('@gwen_guest · gwen@browser.test').waitFor();
        await session.page.getByText("You're using a guest account").waitFor({ state: 'detached', timeout: 5_000 });
        expect(session.problems).toEqual([]);
    });

    it('connects a device with the code it shows', async () => {
        await signUp('Tobi', 'tobi@browser.test');
        const { user_code } = await (
            await fetch(`${base}/api/auth/device/code`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', origin: base },
                body: JSON.stringify({ client_id: 'playground-tv' })
            })
        ).json();
        const session = await browser.open();
        await signInWithForm(session, 'tobi@browser.test', '/device');
        await session.page.getByLabel('Code').fill(user_code);
        await session.page.getByRole('button', { name: 'Continue' }).click();
        await session.page.getByText('Playground TV is asking to sign in to your account.').waitFor();
        await session.page.getByRole('button', { name: 'Approve' }).click();
        await session.page.getByText('Device connected').waitFor();
        expect(session.problems).toEqual([]);
    });

    it('asks for a new password from a reset link', async () => {
        await signUp('Reza', 'reza@browser.test');
        const session = await browser.open();
        await session.go('/forgot-password');
        await session.page.getByLabel('Email', { exact: true }).fill('reza@browser.test');
        await session.page.getByRole('button', { name: 'Send reset link' }).click();
        await session.page.getByText('Check your email').waitFor();

        await session.page.goto(linkIn(await waitForEmail('reza@browser.test', 'reset-password')));
        await session.page.getByLabel('New password').fill('a-new-password-1');
        await session.page.getByRole('button', { name: 'Change password' }).click();
        await session.page.getByText('Password changed').waitFor();
        expect(session.problems).toEqual([]);
    });
});
