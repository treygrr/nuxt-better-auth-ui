<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui';
import { useAuthClientAction } from '@nuxtjs/better-auth/composables';
import { computed, ref, useAuthI18n, useAuthPages, useSeoMeta } from '#imports';

import Captcha from '../../components/auth/Captcha.vue';
import { useCaptcha } from '../../utils/captcha';

const { t, errorMessage } = useAuthI18n();
useSeoMeta({ title: () => t('forgotPassword.title') });

const pages = useAuthPages();
const requestReset = useAuthClientAction((client) => client.requestPasswordReset);
const captcha = useCaptcha('/request-password-reset');
const sentTo = ref<string | null>(null);
const captchaMissing = ref(false);

const fields = computed<AuthFormField[]>(() => [
    { name: 'email', type: 'email', label: t('common.email'), autocomplete: 'email', required: true }
]);

async function onSubmit(event: FormSubmitEvent<{ email: string }>) {
    captchaMissing.value = captcha.missing();
    if (captchaMissing.value) return;
    // Better Auth answers the same whether or not the email has an account, so this never reveals which do.
    await requestReset.execute(
        { email: event.data.email, redirectTo: pages.resetPassword || '/' },
        { headers: captcha.headers() }
    );
    captcha.reset();
    if (!requestReset.error.value) sentTo.value = event.data.email;
}
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <div v-if="sentTo" class="space-y-4 text-center">
                <UIcon name="i-lucide-mail-check" class="size-10 text-primary mx-auto" />
                <h1 class="text-xl font-semibold text-highlighted">{{ t('forgotPassword.sentTitle') }}</h1>
                <p class="text-muted">{{ t('forgotPassword.sentDescription', { email: sentTo }) }}</p>
                <UButton
                    v-if="pages.signIn"
                    :to="pages.signIn"
                    :label="t('common.backToSignIn')"
                    variant="subtle"
                    color="neutral"
                />
            </div>
            <UAuthForm
                v-else
                :fields="fields"
                :title="t('forgotPassword.title')"
                :description="t('forgotPassword.description')"
                icon="i-lucide-key-round"
                :loading="requestReset.status.value === 'pending'"
                :submit="{ label: t('forgotPassword.submit') }"
                @submit="onSubmit"
            >
                <template v-if="pages.signIn" #footer>
                    {{ t('forgotPassword.remembered') }}
                    <ULink :to="pages.signIn" class="text-primary font-medium">{{ t('signUp.signIn') }}</ULink
                    >.
                </template>
                <template #validation>
                    <Captcha
                        v-if="captcha.enabled"
                        :ref="(el) => (captcha.widget.value = el as never)"
                        v-model="captcha.token.value"
                    />
                    <UAlert
                        v-if="captchaMissing || requestReset.error.value"
                        color="error"
                        icon="i-lucide-circle-alert"
                        :title="t('forgotPassword.failed')"
                        :description="captchaMissing ? t('captcha.required') : errorMessage(requestReset.error.value)"
                    />
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
