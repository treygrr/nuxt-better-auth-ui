// The test OAuth provider's sign-in page: approves at once, for the email in ?email= (see server/auth.config.ts).
export default defineEventHandler((event) => {
    if (process.env.PLAYGROUND_MOCK_OAUTH !== '1') throw createError({ statusCode: 404 });
    const { redirect_uri, state, email } = getQuery(event) as Record<string, string>;
    const callback = new URL(redirect_uri);
    callback.searchParams.set('code', email);
    callback.searchParams.set('state', state);
    return sendRedirect(event, callback.href);
});
