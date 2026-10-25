<script setup lang="ts">
import { useAuthClient } from '@nuxtjs/better-auth/composables';
import { computed, ref, useAuthI18n, useAuthPages, useFetch, useRuntimeConfig, useToast } from '#imports';
import { upperFirst } from 'scule';

import CardTitle from './CardTitle.vue';

/**
 * Their subscription, through Better Auth's Stripe plugin: the plan and its status, choosing or changing a plan
 * (Stripe Checkout), cancelling and resuming, and Stripe's billing portal for invoices and payment methods.
 */
const { t, errorMessage, locale } = useAuthI18n();
const toast = useToast();
const pages = useAuthPages();
type Plan = { name: string; limits: Record<string, number>; trialDays: number; annual: boolean };
const { stripePlans } = useRuntimeConfig().public.betterAuthUi as { stripePlans: Plan[] };

type Subscription = {
    id: string;
    plan: string;
    status: string;
    periodEnd?: string | null;
    trialEnd?: string | null;
    cancelAtPeriodEnd?: boolean | null;
    stripeScheduleId?: string | null;
};
// Better Auth's own GET endpoint (active and trialing ones), server-rendered.
const { data: subscriptions, refresh } = useFetch<Subscription[]>('/api/auth/subscription/list', {
    key: 'better-auth-ui-account-subscriptions',
    default: () => []
});
const current = computed(() =>
    subscriptions.value.find((item) => item.status === 'active' || item.status === 'trialing')
);
const annual = ref(false);
const anyAnnual = stripePlans.some((plan) => plan.annual);

// Stripe sends them back here, to the billing tab.
const here = () => `${location.origin}${pages.account || '/'}?tab=billing`;

type Result = Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
type StripeClient = {
    subscription: {
        upgrade(input: {
            plan: string;
            annual?: boolean;
            subscriptionId?: string;
            successUrl: string;
            cancelUrl: string;
            returnUrl?: string;
            locale?: string;
        }): Result;
        cancel(input: { subscriptionId?: string; returnUrl: string }): Result;
        restore(input: { subscriptionId?: string }): Result;
        billingPortal(input: { returnUrl?: string; locale?: string }): Result;
    };
};
const client = () => (useAuthClient() as unknown as StripeClient).subscription;
/** Runs a Stripe plugin call: those that open Stripe redirect there themselves. */
async function run(call: () => Result) {
    const { error } = await call();
    if (error) toast.add({ title: t('account.billing.failed'), description: errorMessage(error), color: 'error' });
    return !error;
}

const choose = (plan: Plan) =>
    run(() =>
        client().upgrade({
            plan: plan.name,
            annual: plan.annual && annual.value,
            subscriptionId: current.value?.id,
            successUrl: here(),
            cancelUrl: here(),
            returnUrl: here(),
            locale: locale.value
        })
    );
const portal = () => run(() => client().billingPortal({ returnUrl: here(), locale: locale.value }));
const cancel = () => run(() => client().cancel({ subscriptionId: current.value?.id, returnUrl: here() }));
async function resume() {
    if (await run(() => client().restore({ subscriptionId: current.value?.id }))) {
        toast.add({ title: t('account.billing.resumed'), color: 'success' });
        await refresh();
    }
}
</script>

<template>
    <div class="space-y-6">
        <UPageCard :title="t('account.billing.title')" :description="t('account.billing.description')" variant="subtle">
            <template #title><CardTitle icon="i-lucide-credit-card" :title="t('account.billing.title')" /></template>

            <div v-if="current" class="flex flex-wrap items-center gap-3">
                <div class="min-w-0 flex-1">
                    <p class="font-medium text-highlighted">
                        {{ upperFirst(current.plan) }}
                        <UBadge
                            :label="
                                current.status === 'trialing' ? t('account.billing.trial') : t('account.billing.active')
                            "
                            :color="current.status === 'trialing' ? 'info' : 'success'"
                            variant="subtle"
                            class="ms-1"
                        />
                    </p>
                    <p v-if="current.periodEnd" class="text-sm text-muted">
                        {{ current.cancelAtPeriodEnd ? t('account.billing.endsOn') : t('account.billing.renewsOn') }}
                        <NuxtTime :datetime="current.periodEnd" date-style="long" :locale="locale" />
                    </p>
                </div>
                <UButton
                    v-if="current.cancelAtPeriodEnd || current.stripeScheduleId"
                    :label="t('account.billing.resume')"
                    loading-auto
                    @click="resume"
                />
                <UButton
                    v-else
                    :label="t('account.billing.cancel')"
                    color="neutral"
                    variant="ghost"
                    loading-auto
                    @click="cancel"
                />
                <UButton
                    :label="t('account.billing.portal')"
                    icon="i-lucide-external-link"
                    color="neutral"
                    variant="outline"
                    loading-auto
                    @click="portal"
                />
            </div>
            <p v-else class="text-sm text-muted">{{ t('account.billing.none') }}</p>
        </UPageCard>

        <UPageCard :title="t('account.billing.plans')" variant="subtle">
            <template v-if="anyAnnual" #footer>
                <USwitch v-model="annual" :label="t('account.billing.yearly')" />
            </template>
            <ul class="grid gap-3 sm:grid-cols-2">
                <li
                    v-for="plan in stripePlans"
                    :key="plan.name"
                    class="rounded-lg ring ring-default p-4 space-y-3"
                    :class="current?.plan === plan.name && 'ring-primary'"
                >
                    <div>
                        <p class="font-semibold text-highlighted">{{ upperFirst(plan.name) }}</p>
                        <p v-if="plan.trialDays" class="text-xs text-muted">
                            {{ t('account.billing.trialDays', { count: plan.trialDays }) }}
                        </p>
                    </div>
                    <ul v-if="Object.keys(plan.limits).length" class="text-sm text-muted space-y-0.5">
                        <li v-for="(limit, key) in plan.limits" :key="key">{{ limit }} {{ key }}</li>
                    </ul>
                    <UBadge
                        v-if="current?.plan === plan.name"
                        :label="t('account.billing.yourPlan')"
                        color="primary"
                        variant="subtle"
                    />
                    <UButton
                        v-else
                        :label="current ? t('account.billing.switch') : t('account.billing.choose')"
                        block
                        loading-auto
                        @click="choose(plan)"
                    />
                </li>
            </ul>
        </UPageCard>
    </div>
</template>
