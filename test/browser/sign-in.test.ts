import { describe, expect, it } from 'vitest';

import { linkIn, waitForEmail } from '../helpers';
import { hasBrowser, signUp, useBrowser } from './browser';

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
