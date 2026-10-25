<script setup lang="ts">
import { useAuthClientAction, useUserSession } from '@nuxtjs/better-auth/composables';
import { useToast } from '#imports';

import { device } from '../../utils/device';

/** Where they're signed in, with signing out of other devices. */
type Session = {
    id: string;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    updatedAt: string;
    createdAt: string;
};
defineProps<{ sessions: Session[] }>();
const emit = defineEmits<{ changed: [] }>();

const { session: current } = useUserSession();
const toast = useToast();
const revoke = useAuthClientAction((client) => client.revokeSession);
const revokeOthers = useAuthClientAction((client) => client.revokeOtherSessions);

async function signOut(session: Session) {
    await revoke.execute({ token: session.token });
    if (revoke.error.value) {
        toast.add({ title: "Couldn't sign it out", description: revoke.error.value.message, color: 'error' });
        return;
    }
    toast.add({ title: `Signed out of ${device(session.userAgent)}`, color: 'success' });
    emit('changed');
}

async function signOutOthers() {
    await revokeOthers.execute();
    if (revokeOthers.error.value) {
        toast.add({ title: "Couldn't sign them out", description: revokeOthers.error.value.message, color: 'error' });
        return;
    }
    toast.add({ title: 'Signed out of your other devices', color: 'success' });
    emit('changed');
}
</script>

<template>
    <UPageCard title="Devices" description="Where you're signed in." variant="subtle">
        <template v-if="sessions.length > 1" #footer>
            <UButton
                label="Sign out of all other devices"
                icon="i-lucide-log-out"
                color="neutral"
                variant="outline"
                :loading="revokeOthers.status.value === 'pending'"
                @click="signOutOthers"
            />
        </template>
        <ul class="divide-y divide-default">
            <li v-for="item in sessions" :key="item.id" class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <UIcon name="i-lucide-monitor-smartphone" class="size-5 shrink-0 text-muted" />
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-highlighted truncate">
                        {{ device(item.userAgent) }}
                        <UBadge
                            v-if="item.id === current?.id"
                            label="This device"
                            color="primary"
                            variant="subtle"
                            size="sm"
                            class="ms-1"
                        />
                    </p>
                    <p class="text-xs text-muted truncate">
                        {{ item.ipAddress || 'Unknown IP' }} · active <NuxtTime :datetime="item.updatedAt" relative /> ·
                        signed in <NuxtTime :datetime="item.createdAt" date-style="medium" />
                    </p>
                </div>
                <UButton
                    v-if="item.id !== current?.id"
                    label="Sign out"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    loading-auto
                    @click="signOut(item)"
                />
            </li>
        </ul>
    </UPageCard>
</template>
