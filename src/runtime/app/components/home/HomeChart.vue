<script setup lang="ts">
import { computed, useAuthI18n } from '#imports';

import type { AdminStats, Period } from '../../types';

const props = defineProps<{
    period: Period;
    stats: AdminStats | null | undefined;
}>();

const { t, locale } = useAuthI18n();
// Numbers and dates in the page's language ("3 mar." in Spanish, "Mar 3" in English).
const formatNumber = computed(() => new Intl.NumberFormat(locale.value).format);
const dateFormats: Record<Period, Intl.DateTimeFormatOptions> = {
    daily: { day: 'numeric', month: 'short' },
    weekly: { day: 'numeric', month: 'short', year: 'numeric' },
    monthly: { month: 'short', year: 'numeric' }
};
const formatDate = (date: Date) => new Intl.DateTimeFormat(locale.value, dateFormats[props.period]).format(date);

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
