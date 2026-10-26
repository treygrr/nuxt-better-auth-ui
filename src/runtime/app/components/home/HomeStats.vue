<script setup lang="ts">
import { computed, useBetterAuthAdminPath, useAuthI18n } from '#imports';

import type { AdminStats, Stat } from '../../types';

const props = defineProps<{ stats: AdminStats | null | undefined }>();

const adminPath = useBetterAuthAdminPath();
const { t, locale } = useAuthI18n();
// In the page's language ("1,234" in English, "1234" in Spanish).
const number = (value: number) => new Intl.NumberFormat(locale.value).format(value);

/** Percent change, or undefined when there's nothing to compare with. */
const change = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : undefined);

const cards = computed<Stat[]>(() => {
    const stats = props.stats;
    if (!stats) return [];
    return [
        {
            title: t('admin.home.stats.users'),
            icon: 'i-lucide-users',
            value: number(stats.users),
            // Growth over the range: new users against everyone who was already here.
            variation: change(stats.users, stats.users - stats.newUsers),
            to: adminPath('/users')
        },
        {
            title: t('admin.home.stats.signUps'),
            icon: 'i-lucide-user-plus',
            value: number(stats.newUsers),
            variation: change(stats.newUsers, stats.previousNewUsers),
            to: adminPath('/users')
        },
        ...(stats.online === null
            ? []
            : [
                  {
                      title: t('admin.home.stats.onlineNow'),
                      icon: 'i-lucide-radio',
                      value: number(stats.online),
                      to: adminPath('/sessions')
                  }
              ]),
        {
            title: t('admin.home.stats.activeSessions'),
            icon: 'i-lucide-monitor-smartphone',
            value: stats.sessions === null ? '—' : number(stats.sessions)
        },
        {
            title: t('admin.home.stats.banned'),
            icon: 'i-lucide-ban',
            value: number(stats.banned),
            to: adminPath('/users?filter=banned')
        }
    ];
});
</script>

<template>
    <UPageGrid class="gap-4 sm:gap-6 lg:gap-px" :class="cards.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'">
        <UPageCard
            v-for="stat in cards"
            :key="stat.title"
            :icon="stat.icon"
            :title="stat.title"
            :to="stat.to"
            variant="subtle"
            :ui="{
                container: 'gap-y-1.5',
                wrapper: 'items-start',
                leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
                title: 'font-normal text-muted text-xs uppercase'
            }"
            class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
        >
            <div class="flex items-center gap-2">
                <span class="text-2xl font-semibold text-highlighted">
                    {{ stat.value }}
                </span>

                <UBadge
                    v-if="stat.variation !== undefined"
                    :color="stat.variation > 0 ? 'success' : stat.variation < 0 ? 'error' : 'neutral'"
                    variant="subtle"
                    class="text-xs"
                >
                    {{ stat.variation > 0 ? '+' : '' }}{{ stat.variation }}%
                </UBadge>
            </div>
        </UPageCard>
    </UPageGrid>
</template>
