<script setup lang="ts">
import { ref, shallowRef, useAdminDashboard, useAdminPath, useAdminUsers, useAsyncData } from '#imports';
import { addDays, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, max, startOfDay, sub } from 'date-fns';
import type { DropdownMenuItem } from '@nuxt/ui';
import type { Period, Range } from '../types';

const adminPath = useAdminPath();

const { isNotificationsSlideoverOpen } = useAdminDashboard();

const items = [
    [
        {
            label: 'New mail',
            icon: 'i-lucide-send',
            to: adminPath('/inbox')
        },
        {
            label: 'New user',
            icon: 'i-lucide-user-plus',
            to: adminPath('/users')
        }
    ]
] satisfies DropdownMenuItem[][];

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

const admin = useAdminUsers();
const { data: stats } = await useAsyncData('better-auth-admin-stats', () => admin.stats(boundaries()), {
    server: false,
    watch: [range, period]
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
                    <UTooltip text="Notifications" :shortcuts="['N']">
                        <UButton color="neutral" variant="ghost" square @click="isNotificationsSlideoverOpen = true">
                            <UChip color="error" inset>
                                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
                            </UChip>
                        </UButton>
                    </UTooltip>

                    <UDropdownMenu :items="items">
                        <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
                    </UDropdownMenu>
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
