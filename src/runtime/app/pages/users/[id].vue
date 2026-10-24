<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { formatTimeAgo } from '@vueuse/core';
import {
    computed,
    navigateTo,
    ref,
    useAdminPath,
    useAdminUsers,
    useAsyncData,
    useBetterAuthAdminConfig,
    useRoute,
    useToast
} from '#imports';

import type { AdminAccount, AdminSession, AdminUser } from '../../types';
import { providerInfo } from '../../utils/providers';

const adminPath = useAdminPath();
const { role: adminRole } = useBetterAuthAdminConfig();
const userId = useRoute().params.id as string;
const session = useUserSession();
const admin = useAdminUsers();
const toast = useToast();

const {
    data: user,
    status,
    error,
    refresh: refreshUser
} = await useAsyncData(`better-auth-admin-user-${userId}`, () => admin.get(userId), { server: false });
const { data: sessions, refresh: refreshSessions } = await useAsyncData(
    `better-auth-admin-user-sessions-${userId}`,
    () => admin.sessions(userId),
    { server: false }
);
const {
    data: accounts,
    error: accountsError,
    refresh: refreshAccounts
} = await useAsyncData(`better-auth-admin-user-accounts-${userId}`, () => admin.accounts(userId), { server: false });
const refresh = () => Promise.all([refreshUser(), refreshSessions(), refreshAccounts()]);

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
    return [
        [
            {
                label: 'Copy account ID',
                icon: 'i-lucide-copy',
                onSelect: async () => {
                    await navigator.clipboard.writeText(account.accountId);
                    toast.add({ title: 'Copied to clipboard', description: account.accountId });
                }
            }
        ],
        [
            {
                label: onlyOne ? 'Remove (their only sign-in method)' : 'Remove',
                icon: 'i-lucide-unlink',
                color: 'error',
                disabled: onlyOne,
                onSelect: () => (removing.value = account)
            }
        ]
    ];
};

const isSelf = computed(() => user.value?.id === session.user.value?.id);
const date = (value?: string | Date | null) => (value ? new Date(value).toLocaleString() : '—');

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
        toast.add({ title: 'Something went wrong', description: (error as Error).message, color: 'error' });
    }
}

const actions = computed<DropdownMenuItem[][]>(() => {
    const current = user.value;
    if (!current) return [];
    return [
        [
            { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => (modal.value = 'edit') },
            {
                label: 'Change role',
                icon: 'i-lucide-shield',
                disabled: isSelf.value,
                onSelect: () => (modal.value = 'role')
            },
            { label: 'Password', icon: 'i-lucide-key-round', onSelect: () => (modal.value = 'password') }
        ],
        [
            current.banned
                ? {
                      label: 'Unban',
                      icon: 'i-lucide-shield-check',
                      onSelect: () => run(() => admin.unban(current.id), `${current.name} was unbanned`)
                  }
                : {
                      label: 'Ban',
                      icon: 'i-lucide-ban',
                      color: 'error',
                      disabled: isSelf.value,
                      onSelect: () => (modal.value = 'ban')
                  },
            {
                label: 'Delete',
                icon: 'i-lucide-trash',
                color: 'error',
                disabled: isSelf.value,
                onSelect: () => (modal.value = 'delete')
            }
        ]
    ];
});

/** A readable device from a user agent, eg "Chrome on Linux". */
function device(userAgent?: string | null) {
    if (!userAgent) return 'Unknown device';
    const browser = /Edg\//.test(userAgent)
        ? 'Edge'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Chrome\//.test(userAgent)
            ? 'Chrome'
            : /Safari\//.test(userAgent)
              ? 'Safari'
              : /curl\//.test(userAgent)
                ? 'curl'
                : 'Browser';
    const os = /Windows/.test(userAgent)
        ? 'Windows'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Android/.test(userAgent)
            ? 'Android'
            : /iPhone|iPad/.test(userAgent)
              ? 'iOS'
              : /Linux/.test(userAgent)
                ? 'Linux'
                : '';
    return os ? `${browser} on ${os}` : browser;
}

const revokeSession = (item: AdminSession) => run(() => admin.revokeSession(item.token), 'Session signed out');
const revokeAll = (current: AdminUser) =>
    run(() => admin.revokeSessions(current.id), `${current.name} was signed out everywhere`);
// The client session omits the token, so match on the session id.
const thisSession = computed(() => session.session.value?.id);
</script>

<template>
    <UDashboardPanel id="better-auth-admin-user">
        <template #header>
            <UDashboardNavbar :title="user?.name ?? 'User'">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
                <template #right>
                    <UButton
                        :to="adminPath('/users')"
                        icon="i-lucide-arrow-left"
                        label="Users"
                        color="neutral"
                        variant="ghost"
                    />
                    <UDropdownMenu v-if="user" :items="actions" :content="{ align: 'end' }">
                        <UButton label="Actions" icon="i-lucide-ellipsis" color="neutral" variant="outline" />
                    </UDropdownMenu>
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <UAlert
                v-if="error"
                color="error"
                icon="i-lucide-circle-alert"
                title="Couldn't load this user"
                :description="error.message"
            >
                <template #actions>
                    <UButton :to="adminPath('/users')" label="Back to users" color="neutral" variant="outline" />
                </template>
            </UAlert>

            <div v-else-if="status === 'pending' && !user" class="space-y-4">
                <USkeleton class="h-32 w-full" />
                <USkeleton class="h-48 w-full" />
            </div>

            <div v-else-if="user" class="flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full lg:max-w-3xl mx-auto">
                <UAlert
                    v-if="user.banned"
                    color="error"
                    variant="subtle"
                    icon="i-lucide-ban"
                    title="Banned"
                    :description="`${user.banReason || 'No reason given'} · ${user.banExpires ? `until ${date(user.banExpires)}` : 'until unbanned'}`"
                >
                    <template #actions>
                        <UButton
                            label="Unban"
                            color="error"
                            variant="outline"
                            loading-auto
                            @click="run(() => admin.unban(user!.id), `${user!.name} was unbanned`)"
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
                                    label="You"
                                    color="neutral"
                                    variant="outline"
                                    class="ms-1 align-middle"
                                />
                            </p>
                            <p class="text-muted truncate">{{ user.email }}</p>
                            <div class="flex flex-wrap gap-1.5 mt-2">
                                <UBadge
                                    :label="user.role ?? 'user'"
                                    :color="user.role === adminRole ? 'primary' : 'neutral'"
                                    variant="subtle"
                                    class="capitalize"
                                />
                                <UBadge
                                    :label="user.emailVerified ? 'Email verified' : 'Email unverified'"
                                    :color="user.emailVerified ? 'success' : 'warning'"
                                    variant="outline"
                                />
                                <UBadge v-if="user.banned" label="Banned" color="error" variant="subtle" />
                            </div>
                        </div>
                    </div>
                </UPageCard>

                <UPageCard title="Details" variant="subtle">
                    <dl class="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
                        <dt class="text-muted">User ID</dt>
                        <dd class="font-mono truncate">{{ user.id }}</dd>
                        <dt class="text-muted">Joined</dt>
                        <dd>{{ date(user.createdAt) }}</dd>
                        <dt class="text-muted">Last updated</dt>
                        <dd>{{ date(user.updatedAt) }}</dd>
                    </dl>
                </UPageCard>

                <UPageCard title="Sign-in methods" :description="`How ${user.name} signs in.`" variant="subtle">
                    <UAlert
                        v-if="accountsError"
                        color="error"
                        variant="subtle"
                        icon="i-lucide-circle-alert"
                        :description="accountsError.message"
                    />
                    <p v-else-if="!accounts?.length" class="text-sm text-muted">
                        No sign-in methods. They can't sign in until they reset their password.
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
                                    Connected {{ date(account.createdAt) }}
                                    <template v-if="account.providerId !== 'credential'"
                                        >· {{ account.providerId }} ID {{ account.accountId }}</template
                                    >
                                </p>
                            </div>
                            <UDropdownMenu :items="accountItems(account)" :content="{ align: 'end' }" class="ms-auto">
                                <UButton
                                    icon="i-lucide-ellipsis-vertical"
                                    color="neutral"
                                    variant="ghost"
                                    :aria-label="`${provider(account).label} actions`"
                                />
                            </UDropdownMenu>
                        </li>
                    </ul>
                </UPageCard>

                <UPageCard title="Sessions" :description="`Where ${user.name} is signed in.`" variant="subtle">
                    <template #footer v-if="sessions?.length && !isSelf">
                        <UButton
                            label="Sign out everywhere"
                            icon="i-lucide-log-out"
                            color="error"
                            variant="outline"
                            loading-auto
                            @click="revokeAll(user!)"
                        />
                    </template>

                    <p v-if="!sessions?.length" class="text-sm text-muted">No active sessions.</p>
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
                                        {{ device(item.userAgent) }}
                                        <UBadge
                                            v-if="item.id === thisSession"
                                            label="This session"
                                            color="primary"
                                            variant="subtle"
                                            size="sm"
                                            class="ms-1"
                                        />
                                        <UBadge
                                            v-if="item.impersonatedBy"
                                            label="Impersonated"
                                            color="warning"
                                            variant="subtle"
                                            size="sm"
                                            class="ms-1"
                                        />
                                    </p>
                                    <p class="text-xs text-muted truncate">
                                        {{ item.ipAddress || 'Unknown IP' }} · active
                                        {{ formatTimeAgo(new Date(item.updatedAt)) }} · expires
                                        {{ date(item.expiresAt) }}
                                    </p>
                                </div>
                            </div>
                            <UButton
                                v-if="item.id !== thisSession"
                                label="Sign out"
                                color="neutral"
                                variant="outline"
                                size="sm"
                                loading-auto
                                @click="revokeSession(item)"
                            />
                        </li>
                    </ul>
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
