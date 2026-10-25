<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import {
    computed,
    navigateTo,
    ref,
    useAdminCan,
    useAdminPath,
    useAdminUsers,
    useAuthCapabilities,
    useAuthI18n,
    useBetterAuthAdminConfig,
    useFetch,
    useLazyFetch,
    useRoute,
    useRuntimeConfig,
    useToast
} from '#imports';

import { ADMIN_API } from '../../../constants';
import { requiresTwoFactor, type TwoFactorRequired } from '../../../two-factor-required';
import type { AdminAccount, AdminAuditEntry, AdminSession, AdminUser } from '../../types';
import { useImpersonateItem } from '../../composables/useImpersonateItem';
import { device } from '../../utils/device';
import { shownItems } from '../../utils/menu';
import { providerInfo } from '../../utils/providers';

const adminPath = useAdminPath();
const { role: adminRole, auditLog, notes } = useBetterAuthAdminConfig();
const userId = useRoute().params.id as string;
const session = useUserSession();
const admin = useAdminUsers();
const toast = useToast();
const can = useAdminCan();
const { t } = useAuthI18n();

// Fetched during server rendering, with the admin's cookies, and handed to the browser in the payload.
const {
    data: user,
    error,
    refresh: refreshUser
} = await useFetch<AdminUser>('/api/auth/admin/get-user', { query: { id: userId } });
// Browser only: Better Auth can't read a POST body from Nuxt's in-process server requests. The card keys off
// `sessions === undefined`, which the server and the hydrating browser agree on (status doesn't: idle vs pending).
const { data: sessions, refresh: refreshSessions } = useLazyFetch('/api/auth/admin/list-user-sessions', {
    method: 'POST',
    body: { userId },
    server: false,
    immediate: can({ session: ['list'] }),
    transform: (result: { sessions: AdminSession[] }) => result.sessions
});
const {
    data: accounts,
    error: accountsError,
    refresh: refreshAccounts
} = await useFetch<AdminAccount[]>(`${ADMIN_API}/users/${encodeURIComponent(userId)}/accounts`);
// When they last signed in, from the audit log, when it records sign-ins.
const { lastSignIn: knowsLastSignIn, auditLogRetentionDays } = useBetterAuthAdminConfig();
const { data: lastSignIns } = await useFetch<Record<string, string | null>>(`${ADMIN_API}/last-sign-in`, {
    query: { userIds: userId },
    default: () => ({}),
    immediate: knowsLastSignIn
});

// When they were last active, with activity tracking.
const { activityTracking } = useBetterAuthAdminConfig();
const { data: lastActive } = await useFetch<Record<string, string | null>>(`${ADMIN_API}/last-active`, {
    query: { userIds: userId },
    default: () => ({}),
    immediate: activityTracking
});

// The latest audit log entries about this user, when the log is on.
const ACTIVITY_SIZE = 10;
const { data: activity, refresh: refreshActivity } = await useFetch<{ entries: AdminAuditEntry[]; total: number }>(
    `${ADMIN_API}/audit`,
    { query: { limit: ACTIVITY_SIZE, offset: 0, userId }, immediate: auditLog }
);
/** The server's message for a failed request, eg Better Auth's "User not found". */
const errorText = (failure: { data?: unknown; statusMessage?: string; message: string }) =>
    (failure.data as { message?: string } | undefined)?.message || failure.statusMessage || failure.message;
const refresh = () => Promise.all([refreshUser(), refreshSessions(), refreshAccounts(), refreshActivity()]);

const provider = (account: AdminAccount) => providerInfo(account.providerId);

// The sign-in method being removed. The last one can't be: it would lock the user out.
const removing = ref<AdminAccount | null>(null);
const removeOpen = computed({
    get: () => removing.value !== null,
    set: (value) => {
        if (!value) removing.value = null;
    }
});
const accountItems = (account: AdminAccount): DropdownMenuItem[][] => {
    const onlyOne = (accounts.value?.length ?? 0) <= 1;
    return shownItems([
        [
            {
                label: t('admin.user.signInMethods.copyId'),
                icon: 'i-lucide-copy',
                onSelect: async () => {
                    await navigator.clipboard.writeText(account.accountId);
                    toast.add({ title: t('admin.common.copied'), description: account.accountId });
                }
            }
        ],
        [
            can({ user: ['update'] }) && {
                label: onlyOne ? t('admin.user.signInMethods.removeOnly') : t('admin.common.remove'),
                icon: 'i-lucide-unlink',
                color: 'error',
                disabled: onlyOne,
                onSelect: () => (removing.value = account)
            }
        ]
    ]);
};

const isSelf = computed(() => user.value?.id === session.user.value?.id);

// Two-factor, when the app uses it: on, off, or required by their role and not set up yet.
const { capabilities } = useAuthCapabilities();
const { twoFactorRequired } = useRuntimeConfig().public.betterAuthUi as { twoFactorRequired: TwoFactorRequired };
const twoFactorBadge = computed(() => {
    if (!capabilities.value?.twoFactor || !user.value) return null;
    if (user.value.twoFactorEnabled) {
        return { label: t('admin.common.twoFactorOn'), color: 'success' as const, icon: 'i-lucide-shield-check' };
    }
    return requiresTwoFactor(user.value, twoFactorRequired)
        ? { label: t('admin.user.twoFactorRequired'), color: 'warning' as const, icon: 'i-lucide-shield-alert' }
        : { label: t('admin.common.twoFactorOff'), color: 'neutral' as const, icon: 'i-lucide-shield-off' };
});

const modal = ref<'role' | 'ban' | 'delete' | 'password' | 'edit' | null>(null);
const modalOpen = (name: NonNullable<typeof modal.value>) =>
    computed({
        get: () => modal.value === name,
        set: (value) => {
            if (!value) modal.value = null;
        }
    });
const roleOpen = modalOpen('role');
const banOpen = modalOpen('ban');
const deleteOpen = modalOpen('delete');
const passwordOpen = modalOpen('password');
const editOpen = modalOpen('edit');

async function run(action: () => Promise<unknown>, success: string) {
    try {
        await action();
        toast.add({ title: success, color: 'success' });
        await refresh();
    } catch (error) {
        toast.add({
            title: t('admin.common.somethingWentWrong'),
            description: (error as Error).message,
            color: 'error'
        });
    }
}

const impersonateItem = useImpersonateItem();

// Only the actions the admin's role allows; some are off for your own account.
const actions = computed<DropdownMenuItem[][]>(() => {
    const current = user.value;
    if (!current) return [];
    return shownItems([
        [
            can({ user: ['update'] }) && {
                label: t('admin.common.edit'),
                icon: 'i-lucide-pencil',
                onSelect: () => (modal.value = 'edit')
            },
            can({ user: ['set-role'] }) && {
                label: t('admin.common.changeRole'),
                icon: 'i-lucide-shield',
                disabled: isSelf.value,
                onSelect: () => (modal.value = 'role')
            },
            {
                label: t('admin.common.password'),
                icon: 'i-lucide-key-round',
                onSelect: () => (modal.value = 'password')
            },
            can({ user: ['update'] }) &&
                !current.emailVerified && {
                    label: t('admin.common.resendVerification'),
                    icon: 'i-lucide-mail',
                    onSelect: () =>
                        run(
                            () => admin.sendVerification(current.id),
                            t('admin.common.verificationSent', { email: current.email })
                        )
                }
        ],
        [impersonateItem(current)],
        [
            can({ user: ['ban'] }) &&
                (current.banned
                    ? {
                          label: t('admin.common.unban'),
                          icon: 'i-lucide-shield-check',
                          onSelect: () =>
                              run(() => admin.unban(current.id), t('admin.common.unbanned', { name: current.name }))
                      }
                    : {
                          label: t('admin.common.ban'),
                          icon: 'i-lucide-ban',
                          color: 'error',
                          disabled: isSelf.value,
                          onSelect: () => (modal.value = 'ban')
                      }),
            can({ user: ['delete'] }) && {
                label: t('admin.common.delete'),
                icon: 'i-lucide-trash',
                color: 'error',
                disabled: isSelf.value,
                onSelect: () => (modal.value = 'delete')
            }
        ]
    ]);
});

const revokeSession = (item: AdminSession) =>
    run(() => admin.revokeSession(item.token), t('admin.common.sessionSignedOut'));
const revokeAll = (current: AdminUser) =>
    run(() => admin.revokeSessions(current.id), t('admin.common.signedOutEverywhere', { name: current.name }));
// The client session omits the token, so match on the session id.
const thisSession = computed(() => session.session.value?.id);
</script>

<template>
    <UDashboardPanel id="better-auth-ui-user">
        <template #header>
            <UDashboardNavbar :title="user?.name ?? t('admin.user.title')">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
                <template #right>
                    <UButton
                        :to="adminPath('/users')"
                        icon="i-lucide-arrow-left"
                        :label="t('admin.user.users')"
                        color="neutral"
                        variant="ghost"
                    />
                    <UDropdownMenu v-if="user" :items="actions" :content="{ align: 'end' }">
                        <UButton
                            :label="t('admin.user.actions')"
                            icon="i-lucide-ellipsis"
                            color="neutral"
                            variant="outline"
                        />
                    </UDropdownMenu>
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <UAlert
                v-if="error"
                color="error"
                icon="i-lucide-circle-alert"
                :title="t('admin.user.loadFailed')"
                :description="errorText(error)"
            >
                <template #actions>
                    <UButton
                        :to="adminPath('/users')"
                        :label="t('admin.user.backToUsers')"
                        color="neutral"
                        variant="outline"
                    />
                </template>
            </UAlert>

            <!-- Loading. Not "status === 'pending'": data loads in the browser only, so the server renders 'idle'. -->
            <div v-else-if="!user" class="space-y-4">
                <USkeleton class="h-32 w-full" />
                <USkeleton class="h-48 w-full" />
            </div>

            <div v-else-if="user" class="flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full lg:max-w-3xl mx-auto">
                <UAlert
                    v-if="user.banned"
                    color="error"
                    variant="subtle"
                    icon="i-lucide-ban"
                    :title="t('admin.user.banned')"
                >
                    <template #description>
                        {{ user.banReason || t('admin.user.noReason') }} ·
                        <template v-if="user.banExpires">
                            {{ t('admin.user.until') }}
                            <NuxtTime :datetime="user.banExpires" date-style="medium" time-style="short" />
                        </template>
                        <template v-else>{{ t('admin.user.untilUnbanned') }}</template>
                    </template>
                    <template v-if="can({ user: ['ban'] })" #actions>
                        <UButton
                            :label="t('admin.common.unban')"
                            color="error"
                            variant="outline"
                            loading-auto
                            @click="run(() => admin.unban(user!.id), t('admin.common.unbanned', { name: user!.name }))"
                        />
                    </template>
                </UAlert>

                <UPageCard variant="subtle">
                    <div class="flex items-center gap-4">
                        <UAvatar :src="user.image ?? undefined" :alt="user.name" size="3xl" />
                        <div class="min-w-0">
                            <p class="text-lg font-semibold text-highlighted truncate">
                                {{ user.name }}
                                <UBadge
                                    v-if="isSelf"
                                    :label="t('admin.common.you')"
                                    color="neutral"
                                    variant="outline"
                                    class="ms-1 align-middle"
                                />
                            </p>
                            <p class="text-muted truncate">
                                <template v-if="user.username"
                                    >@{{ user.displayUsername || user.username }} ·
                                </template>
                                {{ user.email }}
                            </p>
                            <div class="flex flex-wrap gap-1.5 mt-2">
                                <UBadge
                                    :label="user.role ?? 'user'"
                                    :color="user.role === adminRole ? 'primary' : 'neutral'"
                                    variant="subtle"
                                    class="capitalize"
                                />
                                <UBadge
                                    :label="
                                        user.emailVerified
                                            ? t('admin.user.emailVerified')
                                            : t('admin.user.emailUnverified')
                                    "
                                    :color="user.emailVerified ? 'success' : 'warning'"
                                    variant="outline"
                                />
                                <UBadge
                                    v-if="user.banned"
                                    :label="t('admin.common.banned')"
                                    color="error"
                                    variant="subtle"
                                />
                                <UBadge
                                    v-if="twoFactorBadge"
                                    :label="twoFactorBadge.label"
                                    :color="twoFactorBadge.color"
                                    :icon="twoFactorBadge.icon"
                                    variant="outline"
                                />
                            </div>
                        </div>
                    </div>
                </UPageCard>

                <UPageCard :title="t('admin.user.details.title')" variant="subtle">
                    <dl class="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
                        <dt class="text-muted">{{ t('admin.user.details.userId') }}</dt>
                        <dd class="font-mono truncate">{{ user.id }}</dd>
                        <dt class="text-muted">{{ t('admin.common.joined') }}</dt>
                        <dd><NuxtTime :datetime="user.createdAt" date-style="medium" time-style="short" /></dd>
                        <dt class="text-muted">{{ t('admin.user.details.lastUpdated') }}</dt>
                        <dd><NuxtTime :datetime="user.updatedAt" date-style="medium" time-style="short" /></dd>
                        <template v-if="activityTracking">
                            <dt class="text-muted">{{ t('admin.common.lastActive') }}</dt>
                            <dd>
                                <NuxtTime v-if="lastActive[user.id]" :datetime="lastActive[user.id]!" relative title />
                                <span v-else class="text-dimmed">{{ t('admin.user.details.notSinceTracking') }}</span>
                            </dd>
                        </template>
                        <template v-if="knowsLastSignIn">
                            <dt class="text-muted">{{ t('admin.common.lastSignIn') }}</dt>
                            <dd>
                                <NuxtTime
                                    v-if="lastSignIns[user.id]"
                                    :datetime="lastSignIns[user.id]!"
                                    date-style="medium"
                                    time-style="short"
                                />
                                <span v-else class="text-dimmed">{{
                                    auditLogRetentionDays
                                        ? t('admin.common.notInLastDays', { days: auditLogRetentionDays })
                                        : t('admin.common.never')
                                }}</span>
                            </dd>
                        </template>
                    </dl>
                </UPageCard>

                <UPageCard
                    :title="t('admin.user.signInMethods.title')"
                    :description="t('admin.user.signInMethods.description', { name: user.name })"
                    variant="subtle"
                >
                    <UAlert
                        v-if="accountsError"
                        color="error"
                        variant="subtle"
                        icon="i-lucide-circle-alert"
                        :description="errorText(accountsError)"
                    />
                    <p v-else-if="!accounts?.length" class="text-sm text-muted">
                        {{ t('admin.user.signInMethods.none') }}
                    </p>
                    <ul v-else class="divide-y divide-default">
                        <li
                            v-for="account in accounts"
                            :key="account.id"
                            class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                        >
                            <UIcon :name="provider(account).icon" class="size-5 shrink-0 text-muted" />
                            <div class="min-w-0">
                                <p class="text-sm font-medium text-highlighted">{{ provider(account).label }}</p>
                                <p class="text-xs text-muted truncate">
                                    {{ t('admin.user.signInMethods.connected') }}
                                    <NuxtTime :datetime="account.createdAt" date-style="medium" />
                                    <template v-if="account.providerId !== 'credential'"
                                        >·
                                        {{
                                            t('admin.user.signInMethods.accountId', {
                                                provider: account.providerId,
                                                id: account.accountId
                                            })
                                        }}</template
                                    >
                                </p>
                            </div>
                            <UDropdownMenu :items="accountItems(account)" :content="{ align: 'end' }" class="ms-auto">
                                <UButton
                                    icon="i-lucide-ellipsis-vertical"
                                    color="neutral"
                                    variant="ghost"
                                    :aria-label="
                                        t('admin.user.signInMethods.menu', { provider: provider(account).label })
                                    "
                                />
                            </UDropdownMenu>
                        </li>
                    </ul>
                </UPageCard>

                <AdminUsersSecurityCard
                    v-if="capabilities?.twoFactor || capabilities?.passkey"
                    :user="user"
                    @changed="refresh"
                />

                <AdminUsersNotesCard v-if="notes" :user="user" @changed="refresh" />

                <UPageCard
                    v-if="can({ session: ['list'] })"
                    :title="t('admin.user.sessions.title')"
                    :description="t('admin.user.sessions.description', { name: user.name })"
                    variant="subtle"
                >
                    <template #footer v-if="sessions?.length && !isSelf && can({ session: ['revoke'] })">
                        <UButton
                            :label="t('admin.common.signOutEverywhere')"
                            icon="i-lucide-log-out"
                            color="error"
                            variant="outline"
                            loading-auto
                            @click="revokeAll(user!)"
                        />
                    </template>

                    <USkeleton v-if="sessions === undefined" class="h-12 w-full" />
                    <p v-else-if="!sessions?.length" class="text-sm text-muted">{{ t('admin.user.sessions.none') }}</p>
                    <ul v-else class="divide-y divide-default">
                        <li
                            v-for="item in sessions"
                            :key="item.id"
                            class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                            <div class="flex items-center gap-3 min-w-0">
                                <UIcon name="i-lucide-monitor-smartphone" class="size-5 shrink-0 text-muted" />
                                <div class="min-w-0">
                                    <p class="text-sm font-medium text-highlighted truncate">
                                        {{ device(item.userAgent, t) }}
                                        <UBadge
                                            v-if="item.id === thisSession"
                                            :label="t('admin.user.sessions.thisSession')"
                                            color="primary"
                                            variant="subtle"
                                            size="sm"
                                            class="ms-1"
                                        />
                                        <UBadge
                                            v-if="item.impersonatedBy"
                                            :label="t('admin.common.impersonated')"
                                            color="warning"
                                            variant="subtle"
                                            size="sm"
                                            class="ms-1"
                                        />
                                    </p>
                                    <p class="text-xs text-muted truncate">
                                        {{ item.ipAddress || t('admin.common.unknownIp') }} ·
                                        {{ t('admin.user.sessions.active') }}
                                        <NuxtTime :datetime="item.updatedAt" relative /> ·
                                        {{ t('admin.user.sessions.expires') }}
                                        <NuxtTime :datetime="item.expiresAt" date-style="medium" time-style="short" />
                                    </p>
                                </div>
                            </div>
                            <UButton
                                v-if="item.id !== thisSession && can({ session: ['revoke'] })"
                                :label="t('admin.common.signOut')"
                                color="neutral"
                                variant="outline"
                                size="sm"
                                loading-auto
                                @click="revokeSession(item)"
                            />
                        </li>
                    </ul>
                </UPageCard>

                <UPageCard
                    v-if="auditLog"
                    :title="t('admin.user.activity.title')"
                    :description="t('admin.user.activity.description', { name: user.name })"
                    variant="subtle"
                >
                    <template #footer v-if="(activity?.total ?? 0) > ACTIVITY_SIZE">
                        <UButton
                            :label="t('admin.user.activity.all', { count: activity!.total })"
                            :to="adminPath(`/audit?userId=${user.id}`)"
                            color="neutral"
                            variant="subtle"
                            trailing-icon="i-lucide-arrow-right"
                        />
                    </template>
                    <AdminAuditLogTable :entries="activity?.entries ?? []" :user-id="user.id" />
                </UPageCard>

                <AdminUsersRoleModal v-model:open="roleOpen" :user="user" @updated="refresh" />
                <AdminUsersEditModal v-model:open="editOpen" :user="user" @updated="refresh" />
                <AdminUsersPasswordModal v-model:open="passwordOpen" :user="user" />
                <AdminUsersBanModal v-model:open="banOpen" :users="[user]" @banned="refresh" />
                <AdminUsersRemoveAccountModal
                    v-if="removing"
                    v-model:open="removeOpen"
                    :user="user"
                    :account="removing"
                    :label="provider(removing).label"
                    @removed="refresh"
                />
                <AdminUsersDeleteModal
                    v-model:open="deleteOpen"
                    :users="[user]"
                    @deleted="navigateTo(adminPath('/users'))"
                />
            </div>
        </template>
    </UDashboardPanel>
</template>
