<script setup lang="ts">
import { $fetch, computed, ref, useBetterAuthAdminCan, useAuthI18n, useFetch, useToast } from '#imports';

import { ADMIN_API } from '../../../constants';
import type { AdminApiKey } from '../../../server/api/users/api-keys.get';
import type { AdminUser } from '../../types';
import { serverError } from '../../utils/server-error';

/** A user's API keys (API Key plugin), to revoke one that leaked. Shown when the app uses the plugin. */
const props = defineProps<{ user: AdminUser }>();
const emit = defineEmits<{ changed: [] }>();

const canUpdate = useBetterAuthAdminCan()({ user: ['update'] });
const toast = useToast();
const { t, errorMessage } = useAuthI18n();

const base = `${ADMIN_API}/users/${encodeURIComponent(props.user.id)}/api-keys`;
const { data: keys, refresh } = useFetch<AdminApiKey[]>(base, {
    key: `better-auth-ui-admin-api-keys-${props.user.id}`,
    default: () => []
});

const label = (key: AdminApiKey) => key.name || t('admin.apiKeys.unnamed');

const revoking = ref<AdminApiKey | null>(null);
const revokeOpen = computed({
    get: () => revoking.value !== null,
    set: (value) => {
        if (!value) revoking.value = null;
    }
});
async function revoke() {
    const key = revoking.value!;
    try {
        await $fetch(`${base}/${encodeURIComponent(key.id)}`, { method: 'DELETE' });
        toast.add({ title: t('admin.apiKeys.revoked', { key: label(key) }), color: 'success' });
        revoking.value = null;
        await refresh();
        emit('changed');
    } catch (error) {
        toast.add({
            title: t('admin.apiKeys.revokeFailed'),
            description: errorMessage(serverError(error)),
            color: 'error'
        });
    }
}
</script>

<template>
    <UPageCard
        :title="t('admin.apiKeys.title')"
        :description="t('admin.apiKeys.description', { name: user.name })"
        variant="subtle"
    >
        <p v-if="!keys.length" class="text-sm text-muted flex items-center gap-3">
            <UIcon name="i-lucide-key-square" class="size-5 shrink-0" />
            {{ t('admin.apiKeys.none') }}
        </p>
        <ul v-else class="divide-y divide-default">
            <li v-for="key in keys" :key="key.id" class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <UIcon name="i-lucide-key-square" class="size-5 shrink-0 text-primary" />
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-highlighted truncate">
                        {{ label(key) }}
                        <span v-if="key.start" class="font-mono text-xs text-muted ms-1">{{ key.start }}…</span>
                    </p>
                    <p class="text-xs text-muted">
                        <template v-if="key.lastRequest">
                            {{ t('admin.apiKeys.lastUsed') }} <NuxtTime :datetime="key.lastRequest" relative />
                        </template>
                        <template v-else>{{ t('admin.apiKeys.neverUsed') }}</template>
                        ·
                        <template v-if="key.expiresAt">
                            {{ t('admin.apiKeys.expires') }}
                            <NuxtTime :datetime="key.expiresAt" date-style="medium" />
                        </template>
                        <template v-else>{{ t('admin.apiKeys.noExpiry') }}</template>
                    </p>
                </div>
                <UButton
                    v-if="canUpdate"
                    :label="t('admin.common.remove')"
                    color="error"
                    variant="ghost"
                    size="sm"
                    @click="revoking = key"
                />
            </li>
        </ul>

        <UModal
            v-model:open="revokeOpen"
            :title="t('admin.apiKeys.revokeTitle')"
            :description="t('admin.apiKeys.revokeDescription', { key: revoking ? label(revoking) : '' })"
        >
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton
                        :label="t('admin.common.cancel')"
                        color="neutral"
                        variant="subtle"
                        @click="revoking = null"
                    />
                    <UButton :label="t('admin.apiKeys.revoke')" color="error" loading-auto @click="revoke" />
                </div>
            </template>
        </UModal>
    </UPageCard>
</template>
