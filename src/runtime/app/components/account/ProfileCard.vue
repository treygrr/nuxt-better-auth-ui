<script setup lang="ts">
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, reactive, ref, useAuthCapabilities, useAuthI18n, useToast, watch } from '#imports';

import CardTitle from './CardTitle.vue';

/** Name, avatar and (with the Username plugin) username, through Better Auth's updateUser. */
const { t, errorMessage } = useAuthI18n();
const { user, updateUser } = useUserSession();
const { capabilities } = useAuthCapabilities();
const toast = useToast();

type Profile = { name?: string; image?: string | null; username?: string | null; displayUsername?: string | null };
const profile = computed(() => user.value as Profile | null);
const state = reactive({ name: '', image: '', username: '' });
watch(
    profile,
    (current) => {
        state.name = current?.name ?? '';
        state.image = current?.image ?? '';
        state.username = current?.displayUsername || current?.username || '';
    },
    { immediate: true }
);
const saving = ref(false);

// An immutable username can be set once, then not changed.
const usernameLocked = computed(() => !!capabilities.value?.username?.immutable && !!profile.value?.username);
const usernameChanged = computed(
    () =>
        !!capabilities.value?.username &&
        state.username.trim() !== (profile.value?.displayUsername || profile.value?.username || '')
);

async function save() {
    saving.value = true;
    try {
        await updateUser({
            name: state.name.trim(),
            image: state.image.trim() || null,
            ...(usernameChanged.value && !usernameLocked.value && { username: state.username.trim() })
        } as Parameters<typeof updateUser>[0]);
        toast.add({ title: t('account.profile.saved'), color: 'success' });
    } catch (error) {
        toast.add({
            title: t('account.profile.failed'),
            description: errorMessage(error as { code?: string; message?: string }),
            color: 'error'
        });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <UPageCard :title="t('account.profile.title')" :description="t('account.profile.description')" variant="subtle">
        <template #title><CardTitle icon="i-lucide-user-round-pen" :title="t('account.profile.title')" /></template>
        <form class="space-y-4" @submit.prevent="save">
            <div class="flex items-center gap-4">
                <UAvatar :src="state.image || undefined" :alt="state.name" size="3xl" />
                <UFormField :label="t('account.profile.avatar')" class="flex-1">
                    <UInput v-model="state.image" type="url" placeholder="https://…" class="w-full" />
                </UFormField>
            </div>
            <UFormField :label="t('common.name')" required>
                <UInput v-model="state.name" autocomplete="name" required class="w-full" />
            </UFormField>
            <UFormField
                v-if="capabilities?.username"
                :label="t('common.username')"
                :help="
                    usernameLocked
                        ? t('account.profile.usernameLocked')
                        : t('signUp.usernameHelp', {
                              min: capabilities.username.minLength,
                              max: capabilities.username.maxLength
                          })
                "
            >
                <UInput
                    v-model="state.username"
                    autocomplete="username"
                    :disabled="usernameLocked"
                    :minlength="capabilities.username.minLength"
                    :maxlength="capabilities.username.maxLength"
                    class="w-full"
                >
                    <template #leading><span class="text-muted">@</span></template>
                </UInput>
            </UFormField>
            <div class="flex justify-end">
                <UButton type="submit" :label="t('common.save')" :loading="saving" />
            </div>
        </form>
    </UPageCard>
</template>
