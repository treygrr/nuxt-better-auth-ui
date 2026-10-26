import { describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath } from './helpers';

// Bearer tokens and JWTs (betterAuthUi.bearer and jwt, on in the playground), against the built server.
const signIn = async (name: string) => {
    const body = { name, email: `${name}@tokens.test`, password: 'password123' };
    const post = (path: string) =>
        fetch(`${base}/api/auth${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base },
            body: JSON.stringify(body)
        });
    await post('/sign-up/email');
    return post('/sign-in/email');
};

describe('tokens', () => {
    it('show in the capabilities, with the JWKS address', async () => {
        const capabilities = await (await fetch(`${base}/api/_better-auth-ui/capabilities`)).json();
        expect(capabilities.bearer).toBe(true);
        expect(capabilities.jwt).toEqual({ jwksUrl: `${base}/api/auth/jwks` });
    });

    it('sign in with a bearer token instead of a cookie', async () => {
        const token = (await signIn('bea')).headers.get('set-auth-token');
        expect(token).toBeTruthy();
        const session = await (
            await fetch(`${base}/api/auth/get-session`, { headers: { authorization: `Bearer ${token}` } })
        ).json();
        expect(session.user.email).toBe('bea@tokens.test');
    });

    it("don't skip required two-factor: a bearer token is asked to set it up, like a cookie", async () => {
        await signIn('mo');
        new Database(databasePath).prepare("update user set role = 'moderator' where email = 'mo@tokens.test'").run();
        // Signed in again, so the session has the role the playground requires two-factor for.
        const response = await signIn('mo');
        const token = response.headers.get('set-auth-token');
        // Their own data export: any signed-in user's.
        const exportData = (headers: Record<string, string>) =>
            fetch(`${base}/api/_better-auth-ui/export`, { headers });
        const viaToken = await exportData({ authorization: `Bearer ${token}` });
        expect(viaToken.status).toBe(403);
        expect((await viaToken.json()).data).toEqual({ code: 'TWO_FACTOR_SETUP_REQUIRED' });
        expect((await exportData({ cookie: cookiesOf(response) })).status).toBe(403);
    });

    it('give a JWT that the JWKS verifies', async () => {
        const cookie = cookiesOf(await signIn('jay'));
        const { token } = await (await fetch(`${base}/api/auth/token`, { headers: { cookie } })).json();
        const [header, payload] = token
            .split('.')
            .slice(0, 2)
            .map((part: string) => JSON.parse(Buffer.from(part, 'base64url').toString()));
        expect(payload).toMatchObject({ email: 'jay@tokens.test', iss: base });

        const { keys } = await (await fetch(`${base}/api/auth/jwks`)).json();
        const jwk = keys.find((key: { kid: string }) => key.kid === header.kid);
        const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['verify']);
        const [head, body, signature] = token.split('.');
        const valid = await crypto.subtle.verify(
            'Ed25519',
            publicKey,
            Buffer.from(signature, 'base64url'),
            new TextEncoder().encode(`${head}.${body}`)
        );
        expect(valid).toBe(true);
    });
});
