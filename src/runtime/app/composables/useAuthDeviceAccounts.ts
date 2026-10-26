import { useAuthClient, useUserSession } from '@nuxtjs/better-auth/composables';
import type { ComputedRef } from 'vue';
import {
    computed,
    reloadNuxtApp,
    useAuthCapabilities,
    useAuthI18n,
    useAuthPages,
    useFetch,
    useRoute,
    useRuntimeConfig,
    useToast
} from '#imports';

/** An account signed in on this browser, as Better Auth's Multi Session plugin lists it. */
export type DeviceAccount = {
    /** Its session's token, which switching to it and signing it out take. */
    token: string;
    user: { id: string; name: string; email: string; image?: string | null };
    /** The account the browser is using now. */
    current: boolean;
};

type Result = Promise<{ error: { message?: string; code?: string } | null }>;
type MultiSessionClient = {
    multiSession: {
        setActive(input: { sessionToken: string }): Result;
        revoke(input: { sessionToken: string }): Result;
    };
};

/**
 * The accounts signed in on this browser (Better Auth's Multi Session plugin), server-rendered: switch to one, sign
 * one out, or add another through the sign-in page. Switching reloads the app, so every page's data is the new
 * account's. Empty without the plugin.
 */
export function useAuthDeviceAccounts(): {
    accounts: ComputedRef<DeviceAccount[]>;
    switchTo: (account: DeviceAccount) => Promise<void>;
    signOutOf: (account: DeviceAccount) => Promise<void>;
    addAccountLink: ComputedRef<{ path: string; query: Record<string, string> } | null>;
    refresh: () => Promise<void>;
} {
    const { t, errorMessage } = useAuthI18n();
    const toast = useToast();
    const route = useRoute();
    const pages = useAuthPages();
    const { capabilities } = useAuthCapabilities();
    const { user } = useUserSession();
    const { multiSession } = useRuntimeConfig().public.betterAuthUi as { multiSession?: boolean };

    const { data, refresh } = useFetch<Array<{ session: { token: string }; user: DeviceAccount['user'] }>>(
        '/api/auth/multi-session/list-device-sessions',
        {
            key: 'better-auth-ui-device-accounts',
            default: () => [],
            // With the plugin (the module's or the app's own), signed in. Also refetched when another account signs in
            // or out here.
            enabled: () => !!user.value && !!(multiSession || capabilities.value?.multiSession),
            watch: [() => user.value?.id, () => capabilities.value?.multiSession]
        }
    );
    const accounts = computed(() =>
        (data.value ?? []).map((item) => ({
            token: item.session.token,
            user: item.user,
            current: item.user.id === user.value?.id
        }))
    );

    const client = () => (useAuthClient() as unknown as MultiSessionClient).multiSession;
    const failed = (error: { message?: string; code?: string }) => {
        toast.add({ title: t('accounts.failed'), description: errorMessage(error), color: 'error' });
    };

    async function switchTo(account: DeviceAccount) {
        const { error } = await client().setActive({ sessionToken: account.token });
        if (error) return failed(error);
        reloadNuxtApp({ persistState: false });
    }
    async function signOutOf(account: DeviceAccount) {
        const { error } = await client().revoke({ sessionToken: account.token });
        if (error) return failed(error);
        // Signing out of the account in use moves the browser to another one.
        if (account.current) {
            reloadNuxtApp({ persistState: false });
            return;
        }
        toast.add({ title: t('accounts.signedOut', { name: account.user.name }), color: 'success' });
        await refresh();
    }
    // The sign-in page, open to signed-in users for this, and back here after.
    const addAccountLink = computed(() =>
        pages.signIn ? { path: pages.signIn, query: { addAccount: '1', redirect: route.fullPath } } : null
    );
    return { accounts, switchTo, signOutOf, addAccountLink, refresh: () => refresh() };
}
