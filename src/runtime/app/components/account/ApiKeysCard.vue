<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core';
import { useAuthClient } from '@nuxtjs/better-auth/composables';
import * as z from 'zod';
import { $fetch, computed, ref, useAuthI18n, useRuntimeConfig, useToast } from '#imports';

import { UI_API } from '../../../constants';
import { useAccountApiKeys, type AccountApiKey } from '../../utils/account-data';
import { serverError } from '../../utils/server-error';
import CardTitle from './CardTitle.vue';

/**
 * API keys, through Better Auth's API Key plugin: create one (shown once), see each key's first characters, expiry and
 * last use, and revoke it. Created through the module's route, since Better Auth only sets permissions from the server.
 */
const { t, errorMessage, locale } = useAuthI18n();
const toast = useToast();
const { apiKeyScopes } = useRuntimeConfig().public.betterAuthUi as { apiKeyScopes: Record<string, string[]> };
const scopeOptions = Object.entries(apiKeyScopes).flatMap(([resource, actions]) =>
    actions.map((action) => `${resource}:${action}`)
);

const { data: keys, refresh } = useAccountApiKeys();

/** A key's permissions, as "resource:action" (Better Auth may hand them back as JSON text). */
const permissionsOf = (key: AccountApiKey) => {
    let permissions = key.permissions;
    if (typeof permissions === 'string') {
        try {
            permissions = JSON.parse(permissions) as Record<string, string[]>;
        } catch {
            return [];
        }
    }
    return Object.entries(permissions ?? {}).flatMap(([resource, actions]) =>
        actions.map((action) => `${resource}:${action}`)
    );
};
const expired = (key: AccountApiKey) => !!key.expiresAt && new Date(key.expiresAt).getTime() < Date.now();

// Creating: name, expiry and permissions, then the key, shown once.
const creating = ref(false);
const name = ref('');
// Days; 0 never expires (a select can't hold null).
const expiresInDays = ref(90);
const scopes = ref<string[]>([]);
const created = ref<{ key: string; name: string | null } | null>(null);
// The server's own rule for names, checked before sending.
const schema = z.object({
    name: z
        .string()
        .trim()
        .min(1, { error: () => t('errors.API_KEY_NAME_INVALID') })
        .max(64, { error: () => t('errors.API_KEY_NAME_INVALID') })
});
const formState = computed(() => ({ name: name.value }));
const submitting = ref(false);
const expiryItems = computed(() => [
    { label: t('account.apiKeys.days', { count: 30 }), value: 30 },
    { label: t('account.apiKeys.days', { count: 90 }), value: 90 },
    { label: t('account.apiKeys.days', { count: 365 }), value: 365 },
    { label: t('account.apiKeys.never'), value: 0 }
]);
function openCreate() {
    name.value = '';
    expiresInDays.value = 90;
    scopes.value = [];
    created.value = null;
    creating.value = true;
}
async function create() {
    submitting.value = true;
    try {
        created.value = await $fetch<{ key: string; name: string | null }>(`${UI_API}/api-keys`, {
            method: 'POST',
            body: { name: name.value, expiresInDays: expiresInDays.value || null, scopes: scopes.value }
        });
        await refresh();
    } catch (error) {
        toast.add({
            title: t('account.apiKeys.createFailed'),
            description: errorMessage(serverError(error)),
            color: 'error'
        });
    } finally {
        submitting.value = false;
    }
}
const copied = ref(false);
// Cleared on unmount.
const { start: showCopied } = useTimeoutFn(() => (copied.value = false), 2000, { immediate: false });
async function copy() {
    await navigator.clipboard.writeText(created.value!.key);
    copied.value = true;
    showCopied();
}

// Revoking, through Better Auth's own delete.
type ApiKeyClient = {
    apiKey: { delete(input: { keyId: string }): Promise<{ error: { message?: string; code?: string } | null }> };
};
const revoking = ref<AccountApiKey | null>(null);
const revokeOpen = computed({
    get: () => revoking.value !== null,
    set: (value) => {
        if (!value) revoking.value = null;
    }
});
async function revoke() {
    const { error } = await (useAuthClient() as unknown as ApiKeyClient).apiKey.delete({ keyId: revoking.value!.id });
    if (error) {
        toast.add({ title: t('account.apiKeys.revokeFailed'), description: errorMessage(error), color: 'error' });
        return;
    }
    toast.add({ title: t('account.apiKeys.revoked'), color: 'success' });
    revoking.value = null;
    await refresh();
}
</script>

<template>
    <UPageCard :title="t('account.apiKeys.title')" :description="t('account.apiKeys.description')" variant="subtle">
        <template #title><CardTitle icon="i-lucide-key-square" :title="t('account.apiKeys.title')" /></template>

        <p v-if="!keys.length" class="text-sm text-muted">{{ t('account.apiKeys.none') }}</p>
        <ul v-else class="divide-y divide-default">
            <li v-for="key in keys" :key="key.id" class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <UIcon name="i-lucide-key-square" class="size-5 shrink-0 text-muted" />
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-highlighted truncate">
                        {{ key.name || t('account.apiKeys.unnamed') }}
                        <span v-if="key.start" class="font-mono text-xs text-muted ms-1">{{ key.start }}…</span>
                        <UBadge
                            v-if="expired(key)"
                            :label="t('account.apiKeys.expired')"
                            color="warning"
                            variant="subtle"
                            size="sm"
                            class="ms-1"
                        />
                    </p>
                    <p class="text-xs text-muted">
                        <template v-if="key.lastRequest">
                            {{ t('account.apiKeys.lastUsed') }}
                            <NuxtTime :datetime="key.lastRequest" relative :locale="locale" />
                        </template>
                        <template v-else>{{ t('account.apiKeys.neverUsed') }}</template>
                        ·
                        <template v-if="key.expiresAt">
                            {{ t('account.apiKeys.expires') }}
                            <NuxtTime :datetime="key.expiresAt" date-style="medium" :locale="locale" />
                        </template>
                        <template v-else>{{ t('account.apiKeys.noExpiry') }}</template>
                    </p>
                    <div v-if="permissionsOf(key).length" class="flex flex-wrap gap-1 mt-1">
                        <UBadge
                            v-for="scope in permissionsOf(key)"
                            :key="scope"
                            :label="scope"
                            color="neutral"
                            variant="subtle"
                            size="sm"
                        />
                    </div>
                </div>
                <UButton
                    :label="t('account.apiKeys.revoke')"
                    color="error"
                    variant="ghost"
                    size="sm"
                    @click="revoking = key"
                />
            </li>
        </ul>

        <div>
            <UButton :label="t('account.apiKeys.create')" icon="i-lucide-plus" @click="openCreate" />
        </div>

        <UModal
            v-model:open="creating"
            :title="created ? t('account.apiKeys.createdTitle') : t('account.apiKeys.createTitle')"
            :description="created ? t('account.apiKeys.createdDescription') : t('account.apiKeys.description')"
            :dismissible="!created"
        >
            <template #body>
                <div v-if="created" class="flex gap-2">
                    <UInput
                        :model-value="created.key"
                        readonly
                        :aria-label="t('account.apiKeys.title')"
                        class="flex-1"
                        :ui="{ base: 'font-mono' }"
                    />
                    <UButton
                        :label="copied ? t('account.apiKeys.copied') : t('account.apiKeys.copy')"
                        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                        color="neutral"
                        variant="outline"
                        @click="copy"
                    />
                </div>
                <UForm v-else id="api-key-form" :schema="schema" :state="formState" class="space-y-4" @submit="create">
                    <UFormField :label="t('account.apiKeys.name')" name="name" required>
                        <UInput
                            v-model="name"
                            :placeholder="t('account.apiKeys.namePlaceholder')"
                            maxlength="64"
                            autofocus
                            class="w-full"
                        />
                    </UFormField>
                    <UFormField :label="t('account.apiKeys.expiry')" name="expiresInDays">
                        <USelect v-model="expiresInDays" :items="expiryItems" class="w-full" />
                    </UFormField>
                    <UFormField
                        v-if="scopeOptions.length"
                        :label="t('account.apiKeys.permissions')"
                        :help="t('account.apiKeys.permissionsHint')"
                        name="scopes"
                    >
                        <UCheckboxGroup v-model="scopes" :items="scopeOptions" />
                    </UFormField>
                </UForm>
            </template>
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton v-if="created" :label="t('account.apiKeys.done')" @click="creating = false" />
                    <template v-else>
                        <UButton
                            :label="t('common.cancel')"
                            color="neutral"
                            variant="subtle"
                            @click="creating = false"
                        />
                        <UButton
                            type="submit"
                            form="api-key-form"
                            :label="t('account.apiKeys.create')"
                            :disabled="!name.trim()"
                            :loading="submitting"
                        />
                    </template>
                </div>
            </template>
        </UModal>

        <UModal
            v-model:open="revokeOpen"
            :title="t('account.apiKeys.revokeTitle')"
            :description="
                t('account.apiKeys.revokeDescription', { name: revoking?.name || t('account.apiKeys.unnamed') })
            "
        >
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton :label="t('common.cancel')" color="neutral" variant="subtle" @click="revoking = null" />
                    <UButton :label="t('account.apiKeys.revoke')" color="error" loading-auto @click="revoke" />
                </div>
            </template>
        </UModal>
    </UPageCard>
</template>
