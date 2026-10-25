import { describe, expect, it } from 'vitest';

import { Database, databasePath } from '../helpers';
import { hasBrowser, signInWithForm, signUp, useBrowser } from './browser';

// The admin dashboard in a real browser: every page hydrates cleanly, and the search, menu and shortcuts work.
describe.skipIf(!hasBrowser)('admin dashboard (browser)', () => {
    const browser = useBrowser();
    // Signed in, on a freshly loaded (hydrated) admin home.
    const admin = async () => {
        const session = await browser.open({ viewport: { width: 1440, height: 1000 } });
        await signInWithForm(session, 'chief@browser.test', '/admin');
        await session.go('/admin');
        return session;
    };

    it('renders every page cleanly', async () => {
        await signUp('Chief', 'chief@browser.test');
        new Database(databasePath).prepare("update user set role = 'admin' where email = 'chief@browser.test'").run();
        const session = await admin();
        for (const path of ['/admin', '/admin/users', '/admin/sessions', '/admin/audit', '/admin/configuration']) {
            await session.go(path);
            expect(session.path(), path).toBe(path);
        }
        expect(session.problems).toEqual([]);
    });

    it('finds users by name or email from the search, and opens them', async () => {
        await signUp('Searchable Sam', 'sam.finds@browser.test');
        const session = await admin();
        await session.page
            .getByRole('button', { name: /Search/ })
            .first()
            .click();
        await session.page.getByPlaceholder('Search pages and users…').fill('sam.finds');
        await session.page.getByRole('option', { name: /Searchable Sam/ }).click({ timeout: 10_000 });
        await session.page.waitForURL((url) => url.pathname.startsWith('/admin/users/'));
        await session.page.getByText('sam.finds@browser.test').first().waitFor();
    });

    it('has the real menu items, and g then c opens the configuration', async () => {
        const session = await admin();
        await session.page.getByRole('button', { name: 'Chief' }).click();
        const menu = await session.page.getByRole('menu').innerText();
        for (const item of ['Your account', 'Appearance', 'Back to site', 'Log out']) expect(menu).toContain(item);
        await session.page.keyboard.press('Escape');
        await session.page.keyboard.press('g');
        await session.page.keyboard.press('c');
        await session.page.waitForURL((url) => url.pathname === '/admin/configuration');
    });

    it('opens the create form from the home page', async () => {
        const session = await admin();
        await session.page.getByRole('link', { name: 'New user' }).click();
        await session.page.getByRole('dialog').getByText('Add user').first().waitFor();
    });
});
