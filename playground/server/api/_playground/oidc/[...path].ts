// A stand-in OIDC identity provider for the tests' single sign-on (PLAYGROUND_MOCK_OAUTH=1), at the issuer
// {site}/api/_playground/oidc. It approves at once, signing in the email from the login hint (Better Auth sends the
// email typed on the sign-in page) or ?email=; the code and access token are that email. No ID token, so Better Auth
// reads the user from the userinfo endpoint.
export default defineEventHandler(async (event) => {
    if (process.env.PLAYGROUND_MOCK_OAUTH !== '1') throw createError({ statusCode: 404 });
    const issuer = `${getRequestURL(event).origin}/api/_playground/oidc`;
    const path = getRouterParam(event, 'path');

    if (path === '.well-known/openid-configuration') {
        return {
            issuer,
            authorization_endpoint: `${issuer}/authorize`,
            token_endpoint: `${issuer}/token`,
            userinfo_endpoint: `${issuer}/userinfo`,
            jwks_uri: `${issuer}/jwks`,
            response_types_supported: ['code'],
            subject_types_supported: ['public'],
            id_token_signing_alg_values_supported: ['RS256'],
            token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post']
        };
    }
    if (path === 'authorize') {
        const { redirect_uri, state, login_hint, email } = getQuery(event) as Record<string, string>;
        const callback = new URL(redirect_uri);
        callback.searchParams.set('code', email || login_hint || 'worker@sso.test');
        callback.searchParams.set('state', state);
        return sendRedirect(event, callback.href);
    }
    if (path === 'token' && event.method === 'POST') {
        const body = new URLSearchParams(await readRawBody(event));
        return { access_token: body.get('code'), token_type: 'Bearer', expires_in: 3600 };
    }
    if (path === 'userinfo') {
        const email = getRequestHeader(event, 'authorization')?.replace(/^Bearer /, '') ?? '';
        return { sub: email, email, email_verified: true, name: email.split('@')[0] };
    }
    if (path === 'jwks') return { keys: [] };
    throw createError({ statusCode: 404 });
});
