<script setup lang="ts">
import { useAdminPath, useAuthI18n, useFetch } from '#imports';
import { upperFirst } from 'scule';

import { ADMIN_API } from '../../../constants';
import type { AdminUserOrganization } from '../../../server/api/users/organizations.get';
import type { AdminUser } from '../../types';

/** The organizations a user belongs to, and their role in each (Organization plugin). */
const props = defineProps<{ user: AdminUser }>();
const adminPath = useAdminPath();
const { t } = useAuthI18n();

const { data: organizations } = useFetch<AdminUserOrganization[]>(
    `${ADMIN_API}/users/${encodeURIComponent(props.user.id)}/organizations`,
    { key: `better-auth-ui-admin-user-organizations-${props.user.id}`, default: () => [] }
);
</script>

<template>
    <UPageCard
        :title="t('admin.organizations.title')"
        :description="t('admin.organizations.userDescription', { name: user.name })"
        variant="subtle"
    >
        <p v-if="!organizations.length" class="text-sm text-muted">{{ t('admin.organizations.noneForUser') }}</p>
        <ul v-else class="divide-y divide-default">
            <li
                v-for="organization in organizations"
                :key="organization.id"
                class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
                <UIcon name="i-lucide-building-2" class="size-5 shrink-0 text-primary" />
                <div class="min-w-0 flex-1">
                    <ULink
                        :to="adminPath(`/organizations/${organization.id}`)"
                        class="text-sm font-medium text-highlighted hover:underline"
                    >
                        {{ organization.name }}
                    </ULink>
                    <p class="text-xs text-muted">
                        {{ t('admin.organizations.joined') }}
                        <NuxtTime :datetime="organization.joinedAt" date-style="medium" />
                    </p>
                </div>
                <UBadge :label="upperFirst(organization.role)" color="neutral" variant="subtle" />
            </li>
        </ul>
    </UPageCard>
</template>
