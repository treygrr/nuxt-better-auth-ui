<script setup lang="ts">
import { ref, useAuthI18n, useToast } from '#imports';

import { useAccountPasskeys } from '../../utils/account-data';
import CardTitle from './CardTitle.vue';
import {
    passkeyAddError,
    passkeyCancelled,
    passkeysSupported,
    usePasskeyAction,
    type Passkey
} from '../../utils/passkey';

/** Passkeys, through Better Auth's Passkey plugin: adding one, renaming and removing them. */
const { t, errorMessage, locale } = useAuthI18n();
const toast = useToast();

// Better Auth's own GET endpoint for the signed-in user's passkeys, shared with the overview.
const { data: passkeys, refresh } = useAccountPasskeys();

const add = usePasskeyAction('addPasskey');
const update = usePasskeyAction('updatePasskey');
const remove = usePasskeyAction('deletePasskey');

const name = ref('');
const editing = ref<string | null>(null);
const newName = ref('');

async function addPasskey() {
    if (!passkeysSupported()) {
        toast.add({ title: t('account.passkeys.unsupported'), color: 'error' });
        return;
    }
    // The browser asks which device or password manager keeps it.
    await add.execute({ name: name.value.trim() || undefined });
    if (add.error.value) return;
    toast.add({ title: t('account.passkeys.added'), description: t('account.passkeys.addedHint'), color: 'success' });
    name.value = '';
    await refresh();
}

function startRename(passkey: Passkey) {
    editing.value = passkey.id;
    newName.value = passkey.name ?? '';
}

async function rename(passkey: Passkey) {
    await update.execute({ id: passkey.id, name: newName.value.trim() });
    if (update.error.value) {
        toast.add({
            title: t('account.passkeys.renameFailed'),
            description: errorMessage(update.error.value),
            color: 'error'
        });
        return;
    }
    editing.value = null;
    await refresh();
}

async function removePasskey(passkey: Passkey) {
    await remove.execute({ id: passkey.id });
    if (remove.error.value) {
        toast.add({
            title: t('account.passkeys.removeFailed'),
            description: errorMessage(remove.error.value),
            color: 'error'
        });
        return;
    }
    toast.add({
        title: t('account.passkeys.removed', { name: passkey.name || t('account.passkeys.defaultName') }),
        color: 'success'
    });
    await refresh();
}
</script>

<template>
    <UPageCard :title="t('account.passkeys.title')" :description="t('account.passkeys.description')" variant="subtle">
        <template #title><CardTitle icon="i-lucide-fingerprint" :title="t('account.passkeys.title')" /></template>
        <ul v-if="passkeys.length" class="divide-y divide-default">
            <li v-for="item in passkeys" :key="item.id" class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <UIcon name="i-lucide-key-round" class="size-5 shrink-0 text-muted" />
                <form v-if="editing === item.id" class="flex flex-1 items-center gap-2" @submit.prevent="rename(item)">
                    <UInput
                        v-model="newName"
                        :aria-label="t('account.passkeys.nameLabel')"
                        required
                        autofocus
                        class="flex-1"
                    />
                    <UButton
                        type="submit"
                        :label="t('common.save')"
                        size="sm"
                        :loading="update.status.value === 'pending'"
                    />
                    <UButton
                        :label="t('common.cancel')"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        @click="editing = null"
                    />
                </form>
                <template v-else>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-highlighted truncate">
                            {{ item.name || t('account.passkeys.defaultName') }}
                        </p>
                        <p class="text-xs text-muted truncate">
                            {{ item.backedUp ? t('account.passkeys.synced') : t('account.passkeys.oneDevice') }} ·
                            {{ t('account.passkeys.added_on') }}
                            <NuxtTime :datetime="item.createdAt" date-style="medium" :locale="locale" />
                        </p>
                    </div>
                    <UButton
                        icon="i-lucide-pencil"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        :aria-label="t('account.passkeys.rename')"
                        @click="startRename(item)"
                    />
                    <UButton
                        icon="i-lucide-trash-2"
                        color="error"
                        variant="ghost"
                        size="sm"
                        :aria-label="t('account.passkeys.remove')"
                        loading-auto
                        @click="removePasskey(item)"
                    />
                </template>
            </li>
        </ul>

        <form class="flex flex-wrap items-start gap-3" @submit.prevent="addPasskey">
            <UInput
                v-model="name"
                :placeholder="t('account.passkeys.namePlaceholder')"
                :aria-label="t('account.passkeys.nameLabel')"
                class="flex-1 min-w-48"
            />
            <UButton
                type="submit"
                :label="t('account.passkeys.add')"
                icon="i-lucide-plus"
                :loading="add.status.value === 'pending'"
            />
        </form>
        <!-- Closing the prompt isn't a failure: said plainly, not in red. -->
        <p
            v-if="add.error.value"
            class="text-sm"
            :class="passkeyCancelled(add.error.value) ? 'text-muted' : 'text-error'"
        >
            {{ passkeyAddError(add.error.value, t) }}
        </p>
    </UPageCard>
</template>
