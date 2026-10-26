/**
 * Refuses the playground's own inspection routes (sent emails and texts, linked guests: reset links and codes) outside
 * development and the tests, which run the built server with PLAYGROUND_MOCK_OAUTH=1.
 */
export function devOnly() {
    if (!import.meta.dev && process.env.PLAYGROUND_MOCK_OAUTH !== '1') throw createError({ statusCode: 404 });
}
