<script setup lang="ts">
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, navigateTo, useAuthI18n } from '#imports';
import { upperFirst } from 'scule';

import { useSignOutTarget } from '../../composables/useAuthPages';
import type { AccountMethod, AccountSession } from '../../utils/account-data';
import { providerInfo, sortProviders } from '../../utils/providers';

/**
 * Who's signed in, at a glance: their avatar, name, email and role, and a tile for each part of their account's
 * security. Each tile opens the tab where it's managed.
 */
const props = defineProps<{
    accounts: AccountMethod[];
    sessions: AccountSession[];
    /** Null when the app doesn't use the Two-Factor plugin. */
    twoFactor: { enabled: boolean; required: boolean } | null;
    /** How many passkeys; null when the app doesn't use the Passkey plugin. */
    passkeys: number | null;
}>();
const emit = defineEmits<{ open: [tab: string] }>();

const { t, locale } = useAuthI18n();
const { user, signOut } = useUserSession();
const signOutTarget = useSignOutTarget();
const signOutAndLeave = () =>
    signOut({
        onSuccess: async () => {
            await navigateTo(signOutTarget);
        }
    });

type Profile = {
    name: string;
    email: string;
    image?: string | null;
    emailVerified?: boolean;
    role?: string | null;
    createdAt?: string;
    username?: string | null;
    displayUsername?: string | null;
};
const profile = computed(() => user.value as unknown as Profile | null);
// With the Username plugin: their handle, as they typed it.
const handle = computed(() => profile.value?.displayUsername || profile.value?.username);
// The Admin plugin's role; plain users aren't labelled.
const roles = computed(() =>
    (profile.value?.role ?? '')
        .split(',')
        .map((role) => role.trim())
        .filter((role) => role && role !== 'user')
);
const methods = computed(() => sortProviders(props.accounts.map((account) => account.providerId)));

type Tile = {
    label: string;
    value: string;
    icon: string;
    color: 'success' | 'warning' | 'primary' | 'neutral';
    tab: string;
    providers?: string[];
};
const tiles = computed<Tile[]>(() => {
    const verified = profile.value?.emailVerified === true;
    const list: Tile[] = [
        {
            label: t('account.overview.email'),
            value: verified ? t('account.overview.verified') : t('account.overview.unverified'),
            icon: verified ? 'i-lucide-mail-check' : 'i-lucide-mail-warning',
            color: verified ? 'success' : 'warning',
            tab: 'profile'
        }
    ];
    if (props.twoFactor) {
        list.push({
            label: t('account.overview.twoFactor'),
            value: props.twoFactor.enabled
                ? t('common.on')
                : props.twoFactor.required
                  ? t('account.overview.required')
                  : t('common.off'),
            icon: props.twoFactor.enabled ? 'i-lucide-shield-check' : 'i-lucide-shield-off',
            color: props.twoFactor.enabled ? 'success' : props.twoFactor.required ? 'warning' : 'neutral',
            tab: 'security'
        });
    }
    if (props.passkeys !== null) {
        list.push({
            label: t('account.overview.passkeys'),
            value: props.passkeys ? String(props.passkeys) : t('account.overview.noneYet'),
            icon: 'i-lucide-fingerprint',
            color: props.passkeys ? 'primary' : 'neutral',
            tab: 'security'
        });
    }
    list.push(
        {
            label: t('account.overview.methods'),
            value: String(methods.value.length),
            icon: 'i-lucide-log-in',
            color: 'primary',
            tab: 'security',
            providers: methods.value
        },
        {
            label: t('account.overview.devices'),
            value: t('account.overview.signedIn', { count: props.sessions.length }),
            icon: 'i-lucide-monitor-smartphone',
            color: 'primary',
            tab: 'devices'
        }
    );
    return list;
});

// Static class names, so Tailwind sees them.
const tones: Record<Tile['color'], string> = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    primary: 'bg-primary/10 text-primary',
    neutral: 'bg-elevated text-muted'
};
const columns: Record<number, string> = { 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' };
</script>

<template>
    <section class="relative overflow-hidden rounded-xl bg-default ring ring-default">
        <!-- A soft banner behind the avatar. -->
        <div class="h-24 bg-linear-to-br from-primary/30 via-primary/10 to-transparent" />

        <div class="px-4 sm:px-6 pb-6 space-y-5">
            <!-- The avatar sits half over the banner; the name goes below it, on the card. -->
            <div class="flex items-end justify-between gap-4 -mt-10">
                <UAvatar
                    :src="profile?.image ?? undefined"
                    :alt="profile?.name"
                    size="3xl"
                    class="size-20 text-2xl ring-4 ring-(--ui-bg) shadow-sm"
                />
                <UButton
                    :label="t('account.signOut')"
                    icon="i-lucide-log-out"
                    color="neutral"
                    variant="outline"
                    @click="signOutAndLeave"
                />
            </div>
            <div class="-mt-2 min-w-0">
                <h1 class="text-xl font-semibold text-highlighted truncate">{{ profile?.name }}</h1>
                <p class="text-sm text-muted truncate">
                    <template v-if="handle">@{{ handle }} · </template>{{ profile?.email }}
                </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
                <UBadge
                    v-for="role in roles"
                    :key="role"
                    :label="upperFirst(role)"
                    icon="i-lucide-badge-check"
                    color="primary"
                    variant="subtle"
                />
                <span v-if="profile?.createdAt" class="inline-flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-heart" class="size-4" />
                    {{ t('account.overview.memberSince') }}
                    <NuxtTime :datetime="profile.createdAt" month="long" year="numeric" :locale="locale" />
                </span>
            </div>

            <!-- One row of tiles from small screens up; two columns on phones, an odd last tile across both. -->
            <div class="grid grid-cols-2 gap-2" :class="columns[tiles.length]">
                <button
                    v-for="tile in tiles"
                    :key="tile.label"
                    type="button"
                    class="group flex items-center gap-3 rounded-lg bg-elevated/40 p-3 text-start ring ring-default transition hover:-translate-y-0.5 hover:bg-elevated hover:ring-accented focus-visible:outline-2 focus-visible:outline-primary max-sm:odd:last:col-span-2 sm:flex-col sm:items-start sm:gap-2"
                    @click="emit('open', tile.tab)"
                >
                    <span class="grid size-9 shrink-0 place-items-center rounded-full" :class="tones[tile.color]">
                        <UIcon :name="tile.icon" class="size-5" />
                    </span>
                    <span class="min-w-0">
                        <span class="block text-xs text-muted">{{ tile.label }}</span>
                        <span class="flex items-center gap-1.5 font-medium text-highlighted">
                            {{ tile.value }}
                            <UIcon
                                v-for="provider in tile.providers"
                                :key="provider"
                                :name="providerInfo(provider).icon"
                                :aria-label="providerInfo(provider).label"
                                class="size-3.5 text-muted"
                            />
                        </span>
                    </span>
                </button>
            </div>
        </div>
    </section>
</template>
