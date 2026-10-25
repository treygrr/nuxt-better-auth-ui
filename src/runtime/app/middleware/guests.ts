import { useUserSession } from '@nuxtjs/better-auth/composables';
import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig } from '#imports';

import type { AuthPagePaths } from '../composables/useAuthPages';

/**
 * The sign-in and sign-up pages let in signed-in visitors who use them for something: guests (`anonymous`), to keep
 * their account by signing in or up (Better Auth links it), and, with multi-session, anyone adding another account
 * (`?addAccount=1`). Other signed-in users are sent on, as @nuxtjs/better-auth's `guest` route rule would: to its
 * `redirects.guest`, else `/`. Its session plugin has loaded the session by now.
 */
export default defineNuxtRouteMiddleware((to) => {
    const config = useRuntimeConfig().public;
    const { pages, multiSession } = config.betterAuthUi as { pages: AuthPagePaths; multiSession?: boolean };
    if (to.path !== pages.signIn && to.path !== pages.signUp) return;
    const { loggedIn, user } = useUserSession();
    if (!loggedIn.value || (user.value as { isAnonymous?: boolean | null } | null)?.isAnonymous) return;
    if (multiSession && to.query.addAccount) return;
    const auth = config.auth as { redirects?: { guest?: string } } | undefined;
    return navigateTo(auth?.redirects?.guest ?? '/');
});
