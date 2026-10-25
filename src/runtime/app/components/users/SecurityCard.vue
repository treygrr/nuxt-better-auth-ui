<script setup lang="ts">
import {
    $fetch,
    computed,
    ref,
    useAdminCan,
    useAuthCapabilities,
    useAuthI18n,
    useFetch,
    useRuntimeConfig,
    useToast
} from '#imports';

import { ADMIN_API } from '../../../constants';
import type { AdminPasskey } from '../../../server/api/users/passkeys.get';
import { requiresTwoFactor, type TwoFactorRequired } from '../../../two-factor-required';
import type { AdminUser } from '../../types';

/**
 * A user's two-factor and passkeys, for helping someone who lost a device: turning their two-factor off, and removing
 * a passkey. Shown when the app uses either plugin.
 */
const props = defineProps<{ user: AdminUser }>();
const emit = defineEmits<{ changed: [] }>();

const { capabilities } = useAuthCapabilities();
const canUpdate = useAdminCan()({ user: ['update'] });
const toast = useToast();
const { t } = useAuthI18n();
const { twoFactorRequired } = useRuntimeConfig().public.betterAuthUi as { twoFactorRequired: TwoFactorRequired };
const required = computed(() => requiresTwoFactor(props.user, twoFactorRequired));

const base = `${ADMIN_API}/users/${encodeURIComponent(props.user.id)}`;
const { data: passkeys, refresh } = useFetch<AdminPasskey[]>(`${base}/passkeys`, {
    key: `better-auth-ui-admin-passkeys-${props.user.id}`,
    default: () => []
});

/** The server's message for a failed request. */
const message = (error: unknown) =>
    (error as { data?: { statusMessage?: string; message?: string } }).data?.statusMessage ?? (error as Error).message;

const confirmReset = ref(false);
async function resetTwoFactor() {
    try {
        await $fetch(`${base}/two-factor/reset`, { method: 'POST' });
        toast.add({
            title: t('admin.security.turnedOff'),
            description: required.value
                ? t('admin.security.askedAgain', { name: props.user.name })
                : t('admin.security.canSetUpAgain', { name: props.user.name }),
            color: 'success'
        });
        confirmReset.value = false;
        emit('changed');
    } catch (error) {
        toast.add({ title: t('admin.security.resetFailed'), description: message(error), color: 'error' });
    }
}

const removing = ref<AdminPasskey | null>(null);
const removeOpen = computed({
    get: () => removing.value !== null,
    set: (value) => {
        if (!value) removing.value = null;
    }
});
async function removePasskey() {
    const passkey = removing.value!;
    try {
        await $fetch(`${base}/passkeys/${encodeURIComponent(passkey.id)}`, { method: 'DELETE' });
        toast.add({
            title: t('admin.security.removed', { passkey: passkey.name || t('admin.security.thePasskey') }),
            color: 'success'
        });
        removing.value = null;
        await refresh();
        emit('changed');
    } catch (error) {
        toast.add({ title: t('admin.security.removeFailed'), description: message(error), color: 'error' });
    }
}
</script>

<template>
    <UPageCard
        :title="t('admin.security.title')"
        :description="t('admin.security.description', { name: user.name })"
        variant="subtle"
    >
        <div class="divide-y divide-default">
            <!-- Two-factor -->
            <div v-if="capabilities?.twoFactor" class="flex items-center gap-3 pb-3">
                <UIcon
                    :name="user.twoFactorEnabled ? 'i-lucide-shield-check' : 'i-lucide-shield-off'"
                    class="size-5 shrink-0"
                    :class="user.twoFactorEnabled ? 'text-success' : 'text-muted'"
                />
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-highlighted">{{ t('admin.security.twoFactor') }}</p>
                    <p class="text-xs text-muted">
                        {{
                            user.twoFactorEnabled
                                ? t('admin.security.on')
                                : required
                                  ? t('admin.security.offRequired')
                                  : t('admin.security.off')
                        }}
                    </p>
                </div>
                <UButton
                    v-if="user.twoFactorEnabled && canUpdate"
                    :label="t('admin.security.turnOff')"
                    icon="i-lucide-shield-off"
                    color="warning"
                    variant="outline"
                    size="sm"
                    @click="confirmReset = true"
                />
            </div>

            <!-- Passkeys -->
            <div v-if="capabilities?.passkey" :class="capabilities?.twoFactor && 'pt-3'">
                <p v-if="!passkeys.length" class="text-sm text-muted flex items-center gap-3">
                    <UIcon name="i-lucide-fingerprint" class="size-5 shrink-0" />
                    {{ t('admin.security.noPasskeys') }}
                </p>
                <ul v-else class="divide-y divide-default">
                    <li
                        v-for="passkey in passkeys"
                        :key="passkey.id"
                        class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                        <UIcon name="i-lucide-fingerprint" class="size-5 shrink-0 text-primary" />
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-medium text-highlighted truncate">
                                {{ passkey.name || t('admin.security.passkey') }}
                            </p>
                            <p class="text-xs text-muted">
                                {{ passkey.backedUp ? t('admin.security.synced') : t('admin.security.oneDevice') }}
                                <template v-if="passkey.createdAt">
                                    · {{ t('admin.security.added') }}
                                    <NuxtTime :datetime="passkey.createdAt" date-style="medium" />
                                </template>
                            </p>
                        </div>
                        <UButton
                            v-if="canUpdate"
                            :label="t('admin.common.remove')"
                            color="error"
                            variant="ghost"
                            size="sm"
                            @click="removing = passkey"
                        />
                    </li>
                </ul>
            </div>
        </div>

        <UModal
            v-model:open="confirmReset"
            :title="t('admin.security.resetTitle')"
            :description="t('admin.security.resetDescription', { name: user.name })"
        >
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton
                        :label="t('admin.common.cancel')"
                        color="neutral"
                        variant="subtle"
                        @click="confirmReset = false"
                    />
                    <UButton
                        :label="t('admin.security.turnOffTwoFactor')"
                        color="warning"
                        loading-auto
                        @click="resetTwoFactor"
                    />
                </div>
            </template>
        </UModal>

        <UModal
            v-model:open="removeOpen"
            :title="t('admin.security.removeTitle')"
            :description="
                t('admin.security.removeDescription', {
                    name: user.name,
                    passkey: removing?.name || t('admin.security.passkey')
                })
            "
        >
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton
                        :label="t('admin.common.cancel')"
                        color="neutral"
                        variant="subtle"
                        @click="removing = null"
                    />
                    <UButton
                        :label="t('admin.security.removePasskey')"
                        color="error"
                        loading-auto
                        @click="removePasskey"
                    />
                </div>
            </template>
        </UModal>
    </UPageCard>
</template>
