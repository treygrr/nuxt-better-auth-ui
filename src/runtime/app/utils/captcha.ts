import { ref, useRuntimeConfig } from '#imports';

type CaptchaConfig = { provider: string; siteKey: string; endpoints: string[] } | false;

/** Whether a Better Auth path matches one of the captcha's, which may end in `/*` or `/**` as Better Auth allows. */
const guards = (endpoints: string[], path: string) =>
    endpoints.some((pattern) =>
        pattern.endsWith('/**')
            ? path.startsWith(pattern.slice(0, -2))
            : pattern.endsWith('/*')
              ? path.startsWith(pattern.slice(0, -1)) && !path.slice(pattern.length - 1).includes('/')
              : pattern === path
    );

/**
 * The captcha for a Better Auth path, eg `/sign-up/email`, when betterAuthUi.captcha guards it: whether to show the
 * widget, its token, and the header Better Auth reads it from.
 */
export function useCaptcha(path: string) {
    const config = (useRuntimeConfig().public.betterAuthUi as { captcha: CaptchaConfig }).captcha;
    const enabled = !!config && guards(config.endpoints, path);
    const token = ref('');
    const widget = ref<{ reset(): void }>();
    return {
        enabled,
        token,
        widget,
        /** Missing a token the server will ask for. */
        missing: () => enabled && !token.value,
        headers: (): Record<string, string> => (enabled ? { 'x-captcha-response': token.value } : {}),
        /** Tokens work once: a fresh challenge after each request. */
        reset: () => widget.value?.reset()
    };
}
