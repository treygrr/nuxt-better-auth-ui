import { describe, expect, it } from 'vitest';

import { Database, databasePath } from '../helpers';
import { hasBrowser, signInWithForm, signUp, useBrowser } from './browser';

// Exporting and importing users from the users list, in a real browser.
describe.skipIf(!hasBrowser)('exporting and importing users (browser)', () => {
    const browser = useBrowser();

    it('downloads the users, and imports a file after showing what it will do', async () => {
        await signUp('Ivy', 'ivy@browser.test');
        new Database(databasePath).prepare("update user set role = 'admin' where email = 'ivy@browser.test'").run();
        const session = await browser.open({ viewport: { width: 1440, height: 1000 } });
        await signInWithForm(session, 'ivy@browser.test', '/admin/users');

        const [download] = await Promise.all([
            session.page.waitForEvent('download'),
            session.page.getByRole('link', { name: 'Export' }).click()
        ]);
        expect(download.suggestedFilename()).toMatch(/^users-\d{4}-\d{2}-\d{2}\.csv$/);

        await session.page.getByRole('button', { name: 'Import' }).click();
        const dialog = session.page.getByRole('dialog');
        await dialog.locator('input[type="file"]').setInputFiles({
            name: 'team.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(
                'Email,Name,Department\r\nnell@browser.test,Nell,Sales\r\nivy@browser.test,Ivy again,Sales\r\n'
            )
        });
        await dialog.getByText('Ready to import 2 users').waitFor();
        await dialog.getByText('Ignored columns: Department.').waitFor();
        await dialog.getByRole('button', { name: 'Import 2 users' }).click();

        await dialog.getByText('Created 1 user', { exact: true }).waitFor();
        await dialog.getByText('Skipped 1').waitFor();
        await dialog.getByRole('button', { name: 'Done' }).click();
        // The list refreshed with the new user.
        await session.page.getByText('nell@browser.test').first().waitFor();
        expect(session.problems).toEqual([]);
    });
});
