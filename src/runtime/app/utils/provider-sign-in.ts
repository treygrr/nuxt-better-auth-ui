import { useAuthClient, useSignIn, useUserSession } from '@nuxtjs/better-auth/composables';
import { navigateTo, ref, useAuthCapabilities } from '#imports';

type Targets = { callbackURL: string; newUserCallbackURL: string; errorCallbackURL: string };
type AuthError = { message?: string; code?: string } | null;
type PopupClient = {
    signIn: { popup(input: { provider: string } & Targets): Promise<{ data: unknown; error: AuthError }> };
};

/**
 * Signing in with a provider (social or Generic OAuth). With Better Auth's OAuth Popup plugin, in a popup, so the page
 * keeps its state, then on to `callbackURL`; closing the popup just cancels, and where the browser blocks popups it
 * falls back to the redirect. Without the plugin, Better Auth's redirect.
 */
export function useProviderSignIn() {
    const social = useSignIn('social');
    const { capabilities } = useAuthCapabilities();
    const { fetchSession } = useUserSession();
    const popupError = ref<AuthError>(null);

    async function signInWith(provider: string, targets: Targets) {
        popupError.value = null;
        if (capabilities.value?.oauthPopup) {
            const client = useAuthClient() as unknown as PopupClient | null;
            const result = await client?.signIn.popup({ provider, ...targets });
            if (result && !result.error) {
                await fetchSession({ force: true });
                await navigateTo(targets.callbackURL);
                return;
            }
            if (result?.error?.code === 'POPUP_CLOSED') return;
            if (result && result.error?.code !== 'POPUP_BLOCKED') {
                popupError.value = result.error;
                return;
            }
        }
        // Typed from the app's configured providers, which the module can't know: these come from the app's config.
        await social.execute({ provider, ...targets } as Parameters<typeof social.execute>[0]);
    }
    return { signInWith, social, popupError };
}
