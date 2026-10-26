// The test OAuth provider's sign-in page: approves at once, for the email in ?email= (see server/auth.config.ts), or
// a test player when there's none (as from the sign-in page's button).
export default defineEventHandler((event) => {
    if (process.env.PLAYGROUND_MOCK_OAUTH !== '1') throw createError({ statusCode: 404 });
    const { redirect_uri, state, email } = getQuery(event) as Record<string, string | undefined>;
    if (!redirect_uri || !URL.canParse(redirect_uri) || !state) throw createError({ statusCode: 400 });
    const callback = new URL(redirect_uri);
    callback.searchParams.set('code', email || 'player@mock.test');
    callback.searchParams.set('state', state);
    return sendRedirect(event, callback.href);
});
