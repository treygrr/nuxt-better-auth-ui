import { useUserSession } from '@nuxtjs/better-auth/composables';
import { defineNuxtRouteMiddleware, navigateTo, useRequestFetch, useRuntimeConfig, useState } from '#imports';

import { UI_API } from '../../constants';
import type { TwoFactorStatus } from '../../server/api/two-factor.get';
import { needsTwoFactorSetUp, type TwoFactorRequired } from '../../two-factor-required';
import type { AuthPagePaths } from '../composables/useAuthPages';

/**
 * Sends signed-in users who must have two-factor on, and haven't set it up, to the account page to do it, unless
 * they signed in with a passkey. @nuxtjs/better-auth's session plugin has loaded the session by the time route
 * middleware runs; whether it began with a passkey is asked once per session, and only for those users.
 */
export default defineNuxtRouteMiddleware(async (to) => {
    const { user, session } = useUserSession();
    const { pages, twoFactorRequired } = useRuntimeConfig().public.betterAuthUi as {
        pages: AuthPagePaths;
        twoFactorRequired: TwoFactorRequired;
    };
    if (
        !pages.account ||
        !needsTwoFactorSetUp(user.value as Parameters<typeof needsTwoFactorSetUp>[0], twoFactorRequired)
    ) {
        return;
    }
    if (to.path === pages.account || to.path === pages.twoFactor) return;

    const sessionId = (session.value as { id?: string } | null)?.id;
    const passkey = useState<{ sessionId?: string; value: boolean } | null>(
        'better-auth-ui-passkey-session',
        () => null
    );
    if (passkey.value?.sessionId !== sessionId) {
        const status = await useRequestFetch()<TwoFactorStatus>(`${UI_API}/two-factor`).catch(() => null);
        passkey.value = { sessionId, value: status?.passkeySession === true };
    }
    if (passkey.value?.value) return;
    return navigateTo({ path: pages.account, query: { twoFactor: 'required' } });
});
