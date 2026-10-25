<script setup lang="ts">
import { computed, useAuthI18n, useFetch } from '#imports';
import { upperFirst } from 'scule';

import { ADMIN_API } from '../../../constants';
import type { AdminSubscription } from '../../../server/api/users/subscriptions.get';
import type { AdminUser } from '../../types';

/** A user's subscription (Stripe plugin): read-only, since billing changes go through Stripe. */
const props = defineProps<{ user: AdminUser }>();
const { t } = useAuthI18n();

const { data: subscriptions } = useFetch<AdminSubscription[]>(
    `${ADMIN_API}/users/${encodeURIComponent(props.user.id)}/subscriptions`,
    { key: `better-auth-ui-admin-subscriptions-${props.user.id}`, default: () => [] }
);
const colors: Record<string, 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    trialing: 'info',
    past_due: 'warning',
    unpaid: 'error',
    incomplete: 'warning',
    canceled: 'neutral'
};
const latest = computed(() => subscriptions.value.slice(0, 5));
</script>

<template>
    <UPageCard
        :title="t('admin.subscription.title')"
        :description="t('admin.subscription.description', { name: user.name })"
        variant="subtle"
    >
        <p v-if="!latest.length" class="text-sm text-muted">{{ t('admin.subscription.none') }}</p>
        <ul v-else class="divide-y divide-default">
            <li
                v-for="item in latest"
                :key="item.id"
                class="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
                <UIcon name="i-lucide-credit-card" class="size-5 shrink-0 text-muted" />
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-highlighted">
                        {{ upperFirst(item.plan) }}
                        <span v-if="item.billingInterval" class="text-muted font-normal"
                            >· {{ item.billingInterval }}</span
                        >
                    </p>
                    <p v-if="item.periodEnd" class="text-xs text-muted">
                        {{ item.cancelAtPeriodEnd ? t('admin.subscription.ends') : t('admin.subscription.renews') }}
                        <NuxtTime :datetime="item.periodEnd" date-style="medium" />
                    </p>
                </div>
                <UBadge
                    :label="item.status.replace('_', ' ')"
                    :color="colors[item.status] ?? 'neutral'"
                    variant="subtle"
                />
            </li>
        </ul>
    </UPageCard>
</template>
