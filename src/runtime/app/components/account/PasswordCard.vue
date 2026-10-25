<script setup lang="ts">
import { useAuthClientAction, useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, reactive, ref, useAuthCapabilities, useAuthPages, useToast } from '#imports';

import CardTitle from './CardTitle.vue';

/**
 * Changing the password; or, for social-only accounts, setting one through a reset email, as Better Auth's docs
 * recommend (its setPassword is server-only).
 */
const props = defineProps<{ hasPassword: boolean }>();
const emit = defineEmits<{ changed: [] }>();

const { user } = useUserSession();
const { capabilities } = useAuthCapabilities();
const pages = useAuthPages();
const toast = useToast();

const changePassword = useAuthClientAction((client) => client.changePassword);
const requestReset = useAuthClientAction((client) => client.requestPasswordReset);
const state = reactive({ current: '', next: '', signOutOthers: true });
const min = computed(() => capabilities.value?.minPasswordLength ?? 8);
const resetSent = ref(false);

async function change() {
    await changePassword.execute({
        currentPassword: state.current,
        newPassword: state.next,
        revokeOtherSessions: state.signOutOthers
    });
    if (changePassword.error.value) return;
    toast.add({
        title: 'Password changed',
        description: state.signOutOthers ? 'Your other devices have been signed out.' : undefined,
        color: 'success'
    });
    Object.assign(state, { current: '', next: '' });
    emit('changed');
}

async function sendSetLink() {
    await requestReset.execute({ email: user.value!.email, redirectTo: pages.resetPassword || '/' });
    if (!requestReset.error.value) resetSent.value = true;
}
</script>

<template>
    <UPageCard
        title="Password"
        :description="
            props.hasPassword ? 'Change the password you sign in with.' : 'You sign in with a connected account.'
        "
        variant="subtle"
    >
        <template #title><CardTitle icon="i-lucide-lock-keyhole" title="Password" /></template>
        <form v-if="props.hasPassword" class="space-y-4" @submit.prevent="change">
            <UFormField label="Current password" required>
                <UInput
                    v-model="state.current"
                    type="password"
                    autocomplete="current-password"
                    required
                    class="w-full"
                />
            </UFormField>
            <UFormField label="New password" :help="`At least ${min} characters.`" required>
                <UInput
                    v-model="state.next"
                    type="password"
                    autocomplete="new-password"
                    :minlength="min"
                    :maxlength="capabilities?.maxPasswordLength"
                    required
                    class="w-full"
                />
            </UFormField>
            <UCheckbox v-model="state.signOutOthers" label="Sign out of my other devices" />
            <p v-if="changePassword.error.value" class="text-sm text-error">{{ changePassword.error.value.message }}</p>
            <div class="flex justify-end">
                <UButton type="submit" label="Change password" :loading="changePassword.status.value === 'pending'" />
            </div>
        </form>
        <template v-else-if="capabilities?.resetPassword && pages.resetPassword">
            <UAlert
                v-if="resetSent"
                color="success"
                variant="subtle"
                icon="i-lucide-mail-check"
                title="Check your email"
                :description="`We've sent ${user?.email} a link to set a password.`"
            />
            <div v-else class="flex flex-wrap items-center gap-3">
                <p class="text-sm text-muted flex-1">Add a password to sign in with your email too.</p>
                <UButton
                    label="Email me a link to set one"
                    icon="i-lucide-mail"
                    color="neutral"
                    variant="outline"
                    :loading="requestReset.status.value === 'pending'"
                    @click="sendSetLink"
                />
            </div>
        </template>
    </UPageCard>
</template>
