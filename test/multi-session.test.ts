import { beforeAll, describe, expect, it } from 'vitest';

import { base } from './helpers';

// Several accounts signed in at once (betterAuthUi.multiSession, on in the playground), against the built server. The
// browser's cookie jar is kept by hand: each sign-in adds a cookie for its session.
const jar = new Map<string, string>();
const cookie = () => [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
const keep = (response: Response) => {
    for (const header of response.headers.getSetCookie()) {
        const [pair, ...attributes] = header.split(';');
        const [name, value] = pair!.split('=') as [string, string];
        if (attributes.some((attribute) => /max-age=0/i.test(attribute)) || value === '') jar.delete(name);
        else jar.set(name, value);
    }
    return response;
};
const post = async (path: string, body: unknown) =>
    keep(
        await fetch(`${base}/api/auth${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie: cookie() },
            body: JSON.stringify(body)
        })
    );
const get = (path: string) => fetch(`${base}${path}`, { redirect: 'manual', headers: { cookie: cookie() } });
const signUp = (name: string) =>
    fetch(`${base}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base },
        body: JSON.stringify({ name, email: `${name}@multi.test`, password: 'password123' })
    });
const signIn = (name: string) => post('/sign-in/email', { email: `${name}@multi.test`, password: 'password123' });
const whoAmI = async () => (await (await get('/api/auth/get-session')).json())?.user?.email;
const accounts = async () =>
    (await (await get('/api/auth/multi-session/list-device-sessions')).json()) as Array<{
        session: { token: string };
        user: { email: string };
    }>;

beforeAll(async () => {
    await signUp('work');
    await signUp('home');
});

describe('several accounts signed in at once', () => {
    it('shows in the capabilities', async () => {
        const capabilities = await (await fetch(`${base}/api/_better-auth-ui/capabilities`)).json();
        expect(capabilities.multiSession).toEqual({ maximumSessions: 5 });
    });

    it('lets signed-in users back on the sign-in page only to add an account', async () => {
        await signIn('work');
        expect((await get('/login')).status).toBe(302);
        const adding = await get('/login?addAccount=1');
        expect(adding.status).toBe(200);
        expect(await adding.text()).toContain('stay signed in as work');
    });

    it('keeps both accounts, the new one in use, and switches between them', async () => {
        await signIn('home');
        expect(await whoAmI()).toBe('home@multi.test');
        const both = await accounts();
        expect(both.map((item) => item.user.email).sort()).toEqual(['home@multi.test', 'work@multi.test']);

        const work = both.find((item) => item.user.email === 'work@multi.test')!;
        expect((await post('/multi-session/set-active', { sessionToken: work.session.token })).status).toBe(200);
        expect(await whoAmI()).toBe('work@multi.test');
    });

    it('signs one account out and keeps the other', async () => {
        const home = (await accounts()).find((item) => item.user.email === 'home@multi.test')!;
        expect((await post('/multi-session/revoke', { sessionToken: home.session.token })).status).toBe(200);
        expect((await accounts()).map((item) => item.user.email)).toEqual(['work@multi.test']);
        expect(await whoAmI()).toBe('work@multi.test');
    });

    it('shows the accounts on the account page', async () => {
        await signIn('home');
        const page = await (await get('/account?tab=devices')).text();
        expect(page).toContain('Accounts on this device');
        expect(page).toContain('work@multi.test');
        expect(page).toContain('home@multi.test');
    });
});
