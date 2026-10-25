// The test OAuth provider's token endpoint: the access token is the email the code carries.
export default defineEventHandler(async (event) => {
    if (process.env.PLAYGROUND_MOCK_OAUTH !== '1') throw createError({ statusCode: 404 });
    const body = new URLSearchParams(await readRawBody(event));
    return { access_token: body.get('code'), token_type: 'Bearer', expires_in: 3600 };
});
