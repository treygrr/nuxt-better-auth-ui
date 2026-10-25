<script setup lang="ts">
import { useAuthClientAction, useUserSession } from '@nuxtjs/better-auth/composables';
import { useAuthI18n, useToast } from '#imports';

import { device } from '../../utils/device';
import CardTitle from './CardTitle.vue';

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

const { t, errorMessage, locale } = useAuthI18n();
const { session: current } = useUserSession();
const toast = useToast();
const revoke = useAuthClientAction((client) => client.revokeSession);
const revokeOthers = useAuthClientAction((client) => client.revokeOtherSessions);

async function signOut(session: Session) {
    await revoke.execute({ token: session.token });
    if (revoke.error.value) {
        toast.add({
            title: t('account.devices.signOutFailed'),
            description: errorMessage(revoke.error.value),
            color: 'error'
        });
        return;
    }
    toast.add({ title: t('account.devices.signedOutOf', { device: device(session.userAgent, t) }), color: 'success' });
    emit('changed');
}

async function signOutOthers() {
    await revokeOthers.execute();
    if (revokeOthers.error.value) {
        toast.add({
            title: t('account.devices.signOutOthersFailed'),
            description: errorMessage(revokeOthers.error.value),
            color: 'error'
        });
        return;
    }
    toast.add({ title: t('account.devices.othersSignedOut'), color: 'success' });
    emit('changed');
}
</script>

<template>
    <UPageCard :title="t('account.devices.title')" :description="t('account.devices.description')" variant="subtle">
        <template #title><CardTitle icon="i-lucide-monitor-smartphone" :title="t('account.devices.title')" /></template>
        <template v-if="sessions.length > 1" #footer>
            <UButton
                :label="t('account.devices.signOutOthers')"
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
                        {{ device(item.userAgent, t) }}
                        <UBadge
                            v-if="item.id === current?.id"
                            :label="t('account.devices.thisDevice')"
                            color="primary"
                            variant="subtle"
                            size="sm"
                            class="ms-1"
                        />
                    </p>
                    <p class="text-xs text-muted truncate">
                        {{ item.ipAddress || t('account.devices.unknownIp') }} · {{ t('account.devices.active') }}
                        <NuxtTime :datetime="item.updatedAt" relative :locale="locale" /> ·
                        {{ t('account.devices.signedInOn') }}
                        <NuxtTime :datetime="item.createdAt" date-style="medium" :locale="locale" />
                    </p>
                </div>
                <UButton
                    v-if="item.id !== current?.id"
                    :label="t('account.devices.signOut')"
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
