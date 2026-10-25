import { useUserSession } from '@nuxtjs/better-auth/composables';
import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig } from '#imports';

import { isPlaceholderEmail } from '../../server/providers/index';
import type { AuthPagePaths } from '../composables/useAuthPages';

/**
 * Accounts from a provider that shares no email (their email is a placeholder) are sent to the finish-account page to
 * add one, then on to where they were going. The session is loaded by @nuxtjs/better-auth's plugin by now.
 */
export default defineNuxtRouteMiddleware((to) => {
    const { pages } = useRuntimeConfig().public.betterAuthUi as { pages: AuthPagePaths };
    if (!pages.finishAccount || to.path === pages.finishAccount) return;
    const { user } = useUserSession();
    if (!isPlaceholderEmail((user.value as { email?: string } | null)?.email)) return;
    return navigateTo({ path: pages.finishAccount, query: { redirect: to.fullPath } });
});
