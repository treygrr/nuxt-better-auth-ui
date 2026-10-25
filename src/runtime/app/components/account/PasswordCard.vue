<script setup lang="ts">
import { useAuthClientAction, useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, reactive, ref, useAuthCapabilities, useAuthI18n, useAuthPages, useToast } from '#imports';

import CardTitle from './CardTitle.vue';

/**
 * Changing the password; or, for social-only accounts, setting one through a reset email, as Better Auth's docs
 * recommend (its setPassword is server-only).
 */
const props = defineProps<{ hasPassword: boolean }>();
const emit = defineEmits<{ changed: [] }>();

const { t, errorMessage } = useAuthI18n();
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
        title: t('account.password.changed'),
        description: state.signOutOthers ? t('account.password.othersSignedOut') : undefined,
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
        :title="t('common.password')"
        :description="props.hasPassword ? t('account.password.description') : t('account.password.connectedOnly')"
        variant="subtle"
    >
        <template #title><CardTitle icon="i-lucide-lock-keyhole" :title="t('common.password')" /></template>
        <form v-if="props.hasPassword" class="space-y-4" @submit.prevent="change">
            <UFormField :label="t('account.password.current')" required>
                <UInput
                    v-model="state.current"
                    type="password"
                    autocomplete="current-password"
                    required
                    class="w-full"
                />
            </UFormField>
            <UFormField
                :label="t('resetPassword.newPassword')"
                :help="
                    capabilities?.haveIBeenPwned
                        ? `${t('password.minimum', { min })} ${t('password.breachChecked')}`
                        : t('password.minimum', { min })
                "
                required
            >
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
            <UCheckbox v-model="state.signOutOthers" :label="t('account.password.signOutOthers')" />
            <p v-if="changePassword.error.value" class="text-sm text-error">
                {{ errorMessage(changePassword.error.value) }}
            </p>
            <div class="flex justify-end">
                <UButton
                    type="submit"
                    :label="t('resetPassword.submit')"
                    :loading="changePassword.status.value === 'pending'"
                />
            </div>
        </form>
        <template v-else-if="capabilities?.resetPassword && pages.resetPassword">
            <UAlert
                v-if="resetSent"
                color="success"
                variant="subtle"
                icon="i-lucide-mail-check"
                :title="t('account.email.checkTitle')"
                :description="t('account.password.setLinkSent', { email: user?.email ?? '' })"
            />
            <div v-else class="flex flex-wrap items-center gap-3">
                <p class="text-sm text-muted flex-1">{{ t('account.password.addHint') }}</p>
                <UButton
                    :label="t('account.password.sendSetLink')"
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
