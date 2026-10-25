<script setup lang="ts">
import { computed, ref, shallowRef, useAdminCan, useAdminPath, useLazyFetch } from '#imports';
import { addDays, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, max, startOfDay, sub } from 'date-fns';
import { ADMIN_API } from '../../constants';
import type { AdminStats, Period, Range } from '../types';

const adminPath = useAdminPath();
const canCreate = useAdminCan()({ user: ['create'] });

const range = shallowRef<Range>({
    start: sub(new Date(), { days: 14 }),
    end: new Date()
});
const period = ref<Period>('daily');

// The chart's period boundaries in the admin's time zone, from the start of the range to the end of its last day.
// Monthly when the range has too many periods for the server, eg a year by day while the period select catches up.
const MAX_BOUNDARIES = 120;
const boundaries = (by: Period = period.value): Date[] => {
    const start = startOfDay(range.value.start);
    const end = addDays(startOfDay(range.value.end), 1);
    const each: (interval: { start: Date; end: Date }) => Date[] = {
        daily: eachDayOfInterval,
        weekly: eachWeekOfInterval,
        monthly: eachMonthOfInterval
    }[by];
    const starts = each({ start, end: range.value.end }).map((date) => max([date, start]));
    const result = [...new Set([...starts, end].map((date) => date.getTime()))].map((time) => new Date(time));
    return result.length > MAX_BOUNDARIES && by !== 'monthly' ? boundaries('monthly') : result;
};

// Browser only: the periods are days, weeks or months in the admin's time zone, which the server doesn't know.
// The page renders from `stats` alone, which is undefined on the server and while hydrating.
const { data: stats } = useLazyFetch<AdminStats>(`${ADMIN_API}/stats`, {
    query: computed(() => ({
        buckets: boundaries()
            .map((date) => date.toISOString())
            .join(',')
    })),
    server: false
});
</script>

<template>
    <UDashboardPanel id="home">
        <template #header>
            <UDashboardNavbar title="Home" :ui="{ right: 'gap-3' }">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>

                <template #right>
                    <!-- Opens the users page's create form. -->
                    <UButton
                        v-if="canCreate"
                        :to="adminPath('/users?create=1')"
                        icon="i-lucide-user-plus"
                        label="New user"
                    />
                </template>
            </UDashboardNavbar>

            <UDashboardToolbar>
                <template #left>
                    <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
                    <AdminHomeDateRangePicker v-model="range" class="-ms-1" />

                    <AdminHomePeriodSelect v-model="period" :range="range" />
                </template>
            </UDashboardToolbar>
        </template>

        <template #body>
            <AdminHomeStats :stats="stats" />
            <AdminHomeChart :period="period" :stats="stats" />
            <AdminHomeRecentUsers />
        </template>
    </UDashboardPanel>
</template>
