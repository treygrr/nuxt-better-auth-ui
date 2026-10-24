<script setup lang="ts">
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, navigateTo, useAdminPath, useAdminUsers, useToast } from '#imports';

/**
 * Shown while an admin is signed in as someone else, with a way back. Place it in the app's layout:
 * `<AdminImpersonationBanner />`. Renders nothing otherwise.
 */
const session = useUserSession();
const admin = useAdminUsers();
const adminPath = useAdminPath();
const toast = useToast();

const impersonating = computed(
    () => !!(session.session.value as { impersonatedBy?: string | null } | null)?.impersonatedBy
);

async function stop() {
    const userId = session.user.value?.id;
    try {
        await admin.stopImpersonating();
        // A full load, so the whole app picks up the admin's session again.
        await navigateTo(adminPath(userId ? `/users/${userId}` : '/users'), { external: true });
    } catch (error) {
        toast.add({ title: "Couldn't stop impersonating", description: (error as Error).message, color: 'error' });
    }
}
</script>

<template>
    <div
        v-if="impersonating"
        role="status"
        class="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warning px-4 py-2 text-sm text-inverted"
    >
        <UIcon name="i-lucide-venetian-mask" class="size-4 shrink-0" />
        <span>
            You're signed in as <strong>{{ session.user.value?.name }}</strong> ({{ session.user.value?.email }}).
        </span>
        <UButton label="Stop impersonating" size="xs" color="neutral" variant="solid" loading-auto @click="stop" />
    </div>
</template>
