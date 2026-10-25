import { describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath } from './helpers';

// The app's own words (betterAuthUi.messages: the playground calls organizations "Teams"), and the codes the module's
// routes give their errors, which the pages translate.
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });

describe('words', () => {
    it("use the app's own where it gave them", async () => {
        await auth('/sign-up/email', { name: 'Wendy', email: 'wendy@words.test', password: 'password123' });
        const cookie = cookiesOf(await auth('/sign-in/email', { email: 'wendy@words.test', password: 'password123' }));
        const page = await (await fetch(`${base}/account?tab=organizations`, { headers: { cookie } })).text();
        expect(page).toContain('Teams');
    });

    it("give the module's errors a code to translate", async () => {
        await auth('/sign-up/email', { name: 'Words Admin', email: 'admin@words.test', password: 'password123' });
        new Database(databasePath).prepare("update user set role = 'admin' where email = 'admin@words.test'").run();
        const cookie = cookiesOf(await auth('/sign-in/email', { email: 'admin@words.test', password: 'password123' }));
        const missing = await fetch(`${base}/api/_better-auth-ui/users/nobody/notes`, { headers: { cookie } });
        expect(missing.status).toBe(404);
        expect(await missing.json()).toMatchObject({
            statusMessage: 'User not found',
            data: { code: 'USER_NOT_FOUND' }
        });
    });
});
