import { describe, expect, it } from 'vitest';

import { battleNet, epicGames, isPlaceholderEmail, placeholderEmail } from '../src/runtime/server/providers/index';
import { base, cookiesOf, linkIn, waitForEmail } from './helpers';

// The provider helpers (@treygrr/nuxt-better-auth-ui/providers), and providers without an email end to end through the
// playground's mock one (the finish-account page).
describe('provider helpers', () => {
    it('configure Epic Games and Battle.net through their OpenID discovery', () => {
        expect(epicGames({ clientId: 'id', clientSecret: 'secret' })).toMatchObject({
            providerId: 'epic-games',
            discoveryUrl: 'https://api.epicgames.dev/epic/oauth/v2/.well-known/openid-configuration',
            scopes: ['openid', 'basic_profile']
        });
        expect(battleNet({ clientId: 'id', clientSecret: 'secret', region: 'cn' })).toMatchObject({
            providerId: 'battle-net',
            discoveryUrl: 'https://oauth.battlenet.com.cn/.well-known/openid-configuration'
        });
    });

    it('give providers without an email a reserved placeholder', () => {
        const email = placeholderEmail('battle-net', 'Player#1234');
        expect(email).toBe('player-1234.battle-net@no-email.invalid');
        expect(isPlaceholderEmail(email)).toBe(true);
        expect(isPlaceholderEmail('player@example.com')).toBe(false);
    });
});

describe('providers without an email', () => {
    const post = (path: string, body: unknown, cookie = '') =>
        fetch(`${base}/api/auth${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base, cookie },
            body: JSON.stringify(body)
        });

    it('are offered with the social providers', async () => {
        const capabilities = await (await fetch(`${base}/api/_better-auth-ui/capabilities`)).json();
        expect(capabilities.socialProviders).toEqual(expect.arrayContaining(['mock', 'mock-no-email']));
    });

    it('are asked for an email, which a link then makes theirs', async () => {
        // Signing in, as a browser would.
        const start = await post('/sign-in/social', { provider: 'mock-no-email', callbackURL: '/account' });
        const { url } = await start.json();
        const authorize = await fetch(`${url}&email=gamer42`, { redirect: 'manual' });
        const callback = await fetch(authorize.headers.get('location')!, {
            redirect: 'manual',
            headers: { cookie: cookiesOf(start) }
        });
        const cookie = cookiesOf(callback);
        const session = await (await fetch(`${base}/api/auth/get-session`, { headers: { cookie } })).json();
        expect(session.user.email).toBe('gamer42.mock-no-email@no-email.invalid');

        // Every page sends them to add one first.
        const account = await fetch(`${base}/account`, { redirect: 'manual', headers: { cookie } });
        expect(account.status).toBe(302);
        expect(account.headers.get('location')).toBe('/finish-account?redirect=/account');

        expect(
            (await post('/change-email', { newEmail: 'gamer42@finish.test', callbackURL: '/account' }, cookie)).status
        ).toBe(200);
        const email = await waitForEmail('gamer42@finish.test');
        const verified = await fetch(linkIn(email), { redirect: 'manual', headers: { cookie } });
        const after = cookiesOf(verified) || cookie;
        const updated = await (await fetch(`${base}/api/auth/get-session`, { headers: { cookie: after } })).json();
        expect(updated.user.email).toBe('gamer42@finish.test');
        expect((await fetch(`${base}/account`, { redirect: 'manual', headers: { cookie: after } })).status).toBe(200);
    });
});
