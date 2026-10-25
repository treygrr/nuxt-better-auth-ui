// No #imports: plain checks, also used in tests.

const ORIGIN = 'https://better-auth-ui.invalid';

/**
 * A path on this site, or undefined: no other origins, `//`, backslashes or control characters, including encoded
 * ones. The same checks @nuxtjs/better-auth makes before redirecting.
 */
export function safeLocalPath(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return;
    if (
        value.includes('\\') ||
        [...value].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127)
    ) {
        return;
    }
    try {
        const parsed = new URL(value, ORIGIN);
        const normalized = new URL(parsed.pathname.replace(/%(?:2f|5c)/gi, '/'), ORIGIN);
        if (parsed.origin !== ORIGIN || normalized.origin !== ORIGIN || normalized.pathname.startsWith('//')) return;
        return value;
    } catch {
        return;
    }
}
