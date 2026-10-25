import { describe, expect, it } from 'vitest';

import { hasBrowser, signInWithForm, signUp, useBrowser } from './browser';

// Several accounts in one browser: adding one from the account page, then switching back to the first.
describe.skipIf(!hasBrowser)('several accounts signed in at once (browser)', () => {
    const browser = useBrowser();

    it('adds another account from the account page, and switches between them', async () => {
        await signUp('Wren Work', 'wren.work@browser.test');
        await signUp('Wren Home', 'wren.home@browser.test');
        const session = await browser.open();
        await signInWithForm(session, 'wren.work@browser.test', '/account');

        await session.go('/account?tab=devices');
        await session.page.getByRole('link', { name: 'Add another account' }).click();
        await session.page.waitForURL((url) => url.pathname === '/login' && url.searchParams.has('addAccount'));
        await session.page.getByText('stay signed in as Wren Work').waitFor();
        await session.page.getByLabel(/^Email/).fill('wren.home@browser.test');
        await session.page.getByLabel('Password', { exact: true }).fill('password123');
        await session.page.getByRole('button', { name: 'Sign in', exact: true }).click();

        // Back on the account page, as the new account, with both listed.
        await session.page.waitForURL((url) => url.pathname === '/account', { timeout: 10_000 });
        await session.page.getByRole('heading', { name: 'Wren Home' }).waitFor();
        await session.page.getByText('wren.work@browser.test').waitFor();

        await session.page.getByRole('button', { name: 'Switch' }).click();
        await session.page.getByRole('heading', { name: 'Wren Work' }).waitFor({ timeout: 10_000 });
        expect(session.problems).toEqual([]);
    });
});
