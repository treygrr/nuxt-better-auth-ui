<script setup lang="ts">
import { computed, useAuthI18n, watch } from '#imports';
import { eachDayOfInterval } from 'date-fns';
import type { Period, Range } from '../../types';

const model = defineModel<Period>({ required: true });

const props = defineProps<{
    range: Range;
}>();

const { t } = useAuthI18n();
const days = computed(() => eachDayOfInterval(props.range));

const periods = computed<Period[]>(() => {
    if (days.value.length <= 8) {
        return ['daily'];
    }

    if (days.value.length <= 31) {
        return ['daily', 'weekly'];
    }

    return ['weekly', 'monthly'];
});

const PERIOD_LABELS = {
    daily: 'admin.home.periods.daily',
    weekly: 'admin.home.periods.weekly',
    monthly: 'admin.home.periods.monthly'
} as const;
const items = computed(() => periods.value.map((value) => ({ label: t(PERIOD_LABELS[value]), value })));

// Ensure the model value is always a valid period, from the start too.
watch(
    periods,
    () => {
        if (!periods.value.includes(model.value)) {
            model.value = periods.value[0]!;
        }
    },
    { immediate: true }
);
</script>

<template>
    <USelect
        v-model="model"
        :items="items"
        variant="ghost"
        class="data-[state=open]:bg-elevated"
        :ui="{
            value: 'capitalize',
            itemLabel: 'capitalize',
            trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
        }"
    />
</template>
