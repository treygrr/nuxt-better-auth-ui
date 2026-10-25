import { useRoute, useRuntimeConfig } from '#imports';

import { safeLocalPath } from '../utils/redirect';

/** Where the module's sign-in and account pages are (false when the app turned one off). */
export type AuthPagePaths = {
    signIn: string | false;
    signUp: string | false;
    forgotPassword: string | false;
    resetPassword: string | false;
    account: string | false;
};

export const useAuthPages = () => (useRuntimeConfig().public.betterAuthUi as { pages: AuthPagePaths }).pages;

/**
 * Where to go after signing in or up, as @nuxtjs/better-auth decides it: its `?redirect=` (when it sent someone
 * to sign in), else its `redirects.authenticated`, else `/`.
 */
export const useRedirectTarget = () => {
    const auth = useRuntimeConfig().public.auth as
        { redirectQueryKey?: string; redirects?: { authenticated?: string } } | undefined;
    const fromQuery = useRoute().query[auth?.redirectQueryKey ?? 'redirect'];
    return safeLocalPath(fromQuery) ?? safeLocalPath(auth?.redirects?.authenticated) ?? '/';
};
