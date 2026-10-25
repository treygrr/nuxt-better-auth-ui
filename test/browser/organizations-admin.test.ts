import { describe, expect, it } from 'vitest';

import { Database, databasePath } from '../helpers';
import { hasBrowser, signInWithForm, signUp, useBrowser } from './browser';

// Staff and organizations in a real browser: creating one for a user, a team, and making other changes as its owner.
describe.skipIf(!hasBrowser)('organizations in the admin (browser)', () => {
    const browser = useBrowser();

    it('creates an organization for a user, adds a team, and signs in as the owner for the rest', async () => {
        await signUp('Opal', 'opal@browser.test');
        new Database(databasePath).prepare("update user set role = 'admin' where email = 'opal@browser.test'").run();
        await signUp('Oren', 'oren@browser.test');

        const session = await browser.open({ viewport: { width: 1440, height: 1000 } });
        await signInWithForm(session, 'opal@browser.test', '/admin/organizations');
        await session.page.getByRole('button', { name: 'Create organization' }).click();
        const dialog = session.page.getByRole('dialog');
        await dialog.getByLabel('Organization').fill('Oren Works');
        await expect(dialog.getByLabel('Slug').inputValue()).resolves.toBe('oren-works');
        await dialog.getByLabel("Owner's email").fill('oren@browser.test');
        await dialog.getByRole('button', { name: 'Create organization' }).click();

        await session.page.waitForURL((url) => url.pathname.startsWith('/admin/organizations/'), { timeout: 10_000 });
        await session.page.getByText('oren@browser.test').first().waitFor();
        await session.page.getByLabel('Team name').fill('Workshop');
        await session.page.getByRole('button', { name: 'Create team' }).click();
        await session.page.getByText('Created Workshop', { exact: true }).waitFor();
        expect(session.problems).toEqual([]);

        await session.page.getByRole('button', { name: 'Sign in as Oren' }).click();
        await session.page.waitForURL((url) => url.pathname.startsWith('/organization/'), { timeout: 10_000 });
        await session.page.getByRole('heading', { name: 'Oren Works' }).waitFor();
        // The impersonation banner, with the way back.
        await session.page.getByText("You're signed in as").first().waitFor();
    });
});
