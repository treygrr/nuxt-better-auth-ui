<script setup lang="ts">
import { useAdminPath, useAuthI18n, useFetch, useRoute } from '#imports';
import { upperFirst } from 'scule';

import { ADMIN_API } from '../../../constants';
import type { AdminOrganizationDetail } from '../../../server/api/organizations/[id].get';
import { serverError } from '../../utils/server-error';

/**
 * One organization, for staff: its members (linking to their user pages) and pending invitations. Read-only: Better
 * Auth's Organization plugin changes an organization only for its own members, from their account page.
 */
const adminPath = useAdminPath();
const { t, errorMessage } = useAuthI18n();
const id = useRoute().params.id as string;

const { data: organization, error } = await useFetch<AdminOrganizationDetail>(
    `${ADMIN_API}/organizations/${encodeURIComponent(id)}`
);
/** "owner,admin" → "Owner, Admin": Better Auth stores several roles comma-separated. */
const roles = (role: string) =>
    role
        .split(',')
        .map((item) => upperFirst(item.trim()))
        .join(', ');
</script>

<template>
    <UDashboardPanel id="organization">
        <template #header>
            <UDashboardNavbar :title="organization?.name ?? t('admin.organizations.title')">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <UAlert
                v-if="error"
                color="error"
                icon="i-lucide-circle-alert"
                :title="t('admin.organizations.loadFailed')"
                :description="errorMessage(serverError(error))"
            >
                <template #actions>
                    <UButton
                        :to="adminPath('/organizations')"
                        :label="t('admin.organizations.back')"
                        color="neutral"
                        variant="outline"
                    />
                </template>
            </UAlert>

            <div v-else-if="organization" class="flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full lg:max-w-3xl mx-auto">
                <UPageCard variant="subtle">
                    <div class="flex items-center gap-4">
                        <UAvatar :src="organization.logo ?? undefined" :alt="organization.name" size="3xl" />
                        <div class="min-w-0">
                            <p class="text-lg font-semibold text-highlighted truncate">{{ organization.name }}</p>
                            <p class="text-muted truncate">{{ organization.slug }}</p>
                            <p class="text-sm text-muted mt-1">
                                {{ t('admin.organizations.created') }}
                                <NuxtTime :datetime="organization.createdAt" date-style="medium" />
                            </p>
                        </div>
                    </div>
                </UPageCard>

                <UPageCard
                    :title="t('admin.organizations.members', { count: organization.members.length })"
                    :description="t('admin.organizations.readOnly')"
                    variant="subtle"
                >
                    <ul class="divide-y divide-default">
                        <li
                            v-for="member in organization.members"
                            :key="member.id"
                            class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                        >
                            <UAvatar :src="member.user?.image ?? undefined" :alt="member.user?.name" size="md" />
                            <div class="min-w-0 flex-1">
                                <ULink
                                    v-if="member.user"
                                    :to="adminPath(`/users/${member.user.id}`)"
                                    class="text-sm font-medium text-highlighted hover:underline"
                                >
                                    {{ member.user.name }}
                                </ULink>
                                <p class="text-xs text-muted truncate">{{ member.user?.email }}</p>
                            </div>
                            <UBadge :label="roles(member.role)" color="neutral" variant="subtle" />
                        </li>
                    </ul>
                </UPageCard>

                <UPageCard :title="t('admin.organizations.invitations')" variant="subtle">
                    <p v-if="!organization.invitations.length" class="text-sm text-muted">
                        {{ t('admin.organizations.noInvitations') }}
                    </p>
                    <ul v-else class="divide-y divide-default">
                        <li
                            v-for="invitation in organization.invitations"
                            :key="invitation.id"
                            class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                        >
                            <UIcon name="i-lucide-mail" class="size-5 shrink-0 text-muted" />
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-medium text-highlighted truncate">{{ invitation.email }}</p>
                                <p class="text-xs text-muted">
                                    {{ t('admin.organizations.invitedBy', { name: invitation.inviter?.name ?? '—' }) }}
                                    · {{ t('admin.organizations.expires') }}
                                    <NuxtTime :datetime="invitation.expiresAt" date-style="medium" />
                                </p>
                            </div>
                            <UBadge :label="roles(invitation.role)" color="neutral" variant="subtle" />
                        </li>
                    </ul>
                </UPageCard>
            </div>
        </template>
    </UDashboardPanel>
</template>
