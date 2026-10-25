<script setup lang="ts">
import { computed, useAuthI18n } from '#imports';
import { format } from 'date-fns';

import type { AdminStats, Period } from '../../types';

const props = defineProps<{
    period: Period;
    stats: AdminStats | null | undefined;
}>();

const { t } = useAuthI18n();
const formatNumber = new Intl.NumberFormat('en').format;

const formatDate = (date: Date): string =>
    ({
        daily: format(date, 'd MMM'),
        weekly: format(date, 'd MMM yyyy'),
        monthly: format(date, 'MMM yyy')
    })[props.period];

const data = computed(() =>
    (props.stats?.series ?? []).map(({ date, signUps }) => ({ date: formatDate(new Date(date)), signUps }))
);
</script>

<template>
    <UCard :ui="{ root: 'overflow-visible', body: 'p-0! overflow-hidden rounded-b-[inherit]' }">
        <template #header>
            <div>
                <p class="text-xs text-muted uppercase mb-1.5">{{ t('admin.home.signUps') }}</p>
                <p class="text-3xl text-highlighted font-semibold">
                    {{ formatNumber(stats?.newUsers ?? 0) }}
                </p>
            </div>
        </template>

        <UChart
            type="area"
            curve="monotone"
            :data="data"
            index="date"
            :categories="[{ key: 'signUps', label: t('admin.home.signUps') }]"
            :x-axis="false"
            :y-axis="true"
            :grid="true"
            :format="formatNumber"
            :height="240"
            :initial-width="1152"
            class="-my-px"
            :aria-label="t('admin.home.signUps')"
        />
    </UCard>
</template>
