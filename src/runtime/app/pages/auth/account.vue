<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import {
    computed,
    useAuthCapabilities,
    useAuthI18n,
    useRoute,
    useRouter,
    useRuntimeConfig,
    useSeoMeta
} from '#imports';

import { needsTwoFactorSetUp, requiresTwoFactor, type TwoFactorRequired } from '../../../two-factor-required';

import ConnectionsCard from '../../components/account/ConnectionsCard.vue';
import DataCard from '../../components/account/DataCard.vue';
import DeleteCard from '../../components/account/DeleteCard.vue';
import DevicesCard from '../../components/account/DevicesCard.vue';
import EmailCard from '../../components/account/EmailCard.vue';
import GuestCard from '../../components/account/GuestCard.vue';
import OverviewCard from '../../components/account/OverviewCard.vue';
import PasskeysCard from '../../components/account/PasskeysCard.vue';
import PasswordCard from '../../components/account/PasswordCard.vue';
import ProfileCard from '../../components/account/ProfileCard.vue';
import TwoFactorCard from '../../components/account/TwoFactorCard.vue';
import {
    useAccountMethods,
    useAccountPasskeys,
    useAccountSessions,
    useAccountTwoFactor
} from '../../utils/account-data';

const { t } = useAuthI18n();
useSeoMeta({ title: () => t('account.title') });

const { user } = useUserSession();
const route = useRoute();
const router = useRouter();
const { capabilities, loaded } = useAuthCapabilities();

// Better Auth's own GET endpoints for the signed-in user, fetched during server rendering.
const { data: accounts, refresh: refreshAccounts } = useAccountMethods();
const { data: sessions, refresh: refreshSessions } = useAccountSessions();
// Two-factor and passkeys only when the app uses their plugins.
const supported = await loaded;
const twoFactorStatus = supported?.twoFactor ? useAccountTwoFactor().data : null;
const passkeys = supported?.passkey ? useAccountPasskeys().data : null;

// Users who must have two-factor on (betterAuthUi.twoFactor.required) are sent here until they've set it up.
const { twoFactorRequired } = useRuntimeConfig().public.betterAuthUi as { twoFactorRequired: TwoFactorRequired };
type TwoFactorUser = Parameters<typeof needsTwoFactorSetUp>[0];
const twoFactorIsRequired = computed(() => requiresTwoFactor(user.value as TwoFactorUser, twoFactorRequired));
// Required but not set up: blocking after a password (or social) sign-in. A passkey sign-in is complete on its own,
// so then it's only needed for signing in with the password later.
const twoFactorMissing = computed(
    () => !!capabilities.value?.twoFactor && needsTwoFactorSetUp(user.value as TwoFactorUser, twoFactorRequired)
);
const passkeySession = computed(() => twoFactorStatus?.value?.passkeySession === true);
const twoFactorSetUpNeeded = computed(() => twoFactorMissing.value && !passkeySession.value);
// For the overview: null when the plugin isn't in use.
const twoFactorSummary = computed(() =>
    twoFactorStatus ? { enabled: twoFactorStatus.value?.enabled === true, required: twoFactorSetUpNeeded.value } : null
);
const passkeyCount = computed(() => (passkeys ? passkeys.value.length : null));

// A guest (Anonymous plugin) has a generated email and nothing to sign in with again: they keep the account by
// signing up or in, so it shows that instead of email, password and security settings.
const isGuest = computed(() => (user.value as { isAnonymous?: boolean | null } | null)?.isAnonymous === true);

const hasPassword = computed(() => accounts.value.some((account) => account.providerId === 'credential'));
const showConnections = computed(
    () =>
        (capabilities.value?.socialProviders.length ?? 0) > 0 ||
        accounts.value.some((account) => account.providerId !== 'credential')
);

const tabs = computed<TabsItem[]>(() => [
    { label: t('account.tabs.profile'), icon: 'i-lucide-user-round', value: 'profile', slot: 'profile' },
    ...(isGuest.value
        ? []
        : [
              {
                  label: t('account.tabs.security'),
                  icon: 'i-lucide-shield-check',
                  value: 'security',
                  slot: 'security',
                  badge: twoFactorSetUpNeeded.value
                      ? { label: t('account.tabs.actionNeeded'), color: 'warning' as const, variant: 'subtle' as const }
                      : undefined
              }
          ]),
    {
        label: t('account.tabs.devices'),
        icon: 'i-lucide-monitor-smartphone',
        value: 'devices',
        slot: 'devices',
        badge:
            sessions.value.length > 1
                ? { label: String(sessions.value.length), color: 'neutral', variant: 'soft' }
                : undefined
    },
    ...(capabilities.value?.deleteUser && !isGuest.value
        ? [{ label: t('account.tabs.delete'), icon: 'i-lucide-trash-2', value: 'delete', slot: 'delete' }]
        : [])
]);

// The open tab lives in the URL (?tab=security), so it's server-rendered, survives reloads and can be linked to.
const tab = computed({
    get() {
        const requested = route.query.tab;
        if (typeof requested === 'string' && tabs.value.some((item) => item.value === requested)) return requested;
        return twoFactorSetUpNeeded.value ? 'security' : 'profile';
    },
    set(value: string) {
        router.replace({ query: { ...route.query, tab: value } });
    }
});
const open = (value: string) => {
    tab.value = value;
};
</script>

<template>
    <UContainer class="py-12">
        <div class="w-full max-w-3xl mx-auto space-y-6">
            <OverviewCard
                :accounts="accounts"
                :sessions="sessions"
                :two-factor="twoFactorSummary"
                :passkeys="passkeyCount"
                :guest="isGuest"
                @open="open"
            />

            <GuestCard v-if="isGuest" />

            <UAlert
                v-if="twoFactorSetUpNeeded"
                color="warning"
                variant="subtle"
                icon="i-lucide-shield-alert"
                :title="t('account.required.title')"
                :description="t('account.required.description')"
                :actions="[{ label: t('account.required.action'), color: 'warning', onClick: () => open('security') }]"
            />
            <UAlert
                v-else-if="twoFactorMissing && passkeySession"
                color="info"
                variant="subtle"
                icon="i-lucide-fingerprint"
                :title="t('account.passkeySession.title')"
                :description="t('account.passkeySession.description')"
                :actions="[
                    {
                        label: t('account.required.action'),
                        color: 'info',
                        variant: 'outline',
                        onClick: () => open('security')
                    }
                ]"
            />

            <!-- On phones only the open tab shows its label (the others' stay readable to screen readers). -->
            <UTabs
                v-model="tab"
                :items="tabs"
                variant="link"
                :ui="{
                    list: 'mb-2 overflow-x-auto overflow-y-hidden',
                    trigger: 'grow shrink-0 px-2.5 sm:px-3',
                    label: 'overflow-visible max-sm:group-data-[state=inactive]:sr-only'
                }"
                class="w-full"
            >
                <template #profile>
                    <div class="space-y-6">
                        <ProfileCard />
                        <EmailCard v-if="!isGuest" />
                        <DataCard />
                    </div>
                </template>

                <template #security>
                    <div class="space-y-6">
                        <PasswordCard
                            v-if="capabilities?.emailAndPassword"
                            :has-password="hasPassword"
                            @changed="refreshSessions()"
                        />
                        <PasskeysCard v-if="capabilities?.passkey" />
                        <TwoFactorCard
                            v-if="capabilities?.twoFactor"
                            :has-password="hasPassword"
                            :required="twoFactorIsRequired"
                            @changed="refreshSessions()"
                        />
                        <ConnectionsCard v-if="showConnections" :accounts="accounts" @changed="refreshAccounts()" />
                    </div>
                </template>

                <template #devices>
                    <DevicesCard :sessions="sessions" @changed="refreshSessions()" />
                </template>

                <template #delete>
                    <DeleteCard :has-password="hasPassword" />
                </template>
            </UTabs>
        </div>
    </UContainer>
</template>
