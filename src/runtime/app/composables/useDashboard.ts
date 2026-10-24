import { defineShortcuts, ref, useAdminPath, useRoute, useRouter, watch } from '#imports';
import { createSharedComposable } from '@vueuse/core';

const _useDashboard = () => {
    const route = useRoute();
    const router = useRouter();
    const adminPath = useAdminPath();
    const isNotificationsSlideoverOpen = ref(false);

    defineShortcuts({
        'g-h': () => router.push(adminPath('/')),
        'g-i': () => router.push(adminPath('/inbox')),
        'g-c': () => router.push(adminPath('/customers')),
        'g-s': () => router.push(adminPath('/settings')),
        n: () => (isNotificationsSlideoverOpen.value = !isNotificationsSlideoverOpen.value)
    });

    watch(
        () => route.fullPath,
        () => {
            isNotificationsSlideoverOpen.value = false;
        }
    );

    return {
        isNotificationsSlideoverOpen
    };
};

export const useAdminDashboard = createSharedComposable(_useDashboard);
