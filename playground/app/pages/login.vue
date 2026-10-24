<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui';

definePageMeta({ auth: 'guest' });

const fields: AuthFormField[] = [
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'password', type: 'password', label: 'Password', required: true }
];

const signIn = useSignIn('email');

// With no onSuccess, @nuxtjs/better-auth follows ?redirect= after signing in.
function onSubmit(event: FormSubmitEvent<{ email: string; password: string }>) {
    signIn.execute({ email: event.data.email, password: event.data.password });
}
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <UAuthForm
                :fields="fields"
                title="Sign in"
                icon="i-lucide-lock"
                :loading="signIn.status.value === 'pending'"
                :submit="{ label: 'Sign in' }"
                @submit="onSubmit"
            >
                <template #description>
                    No account? <ULink to="/signup" class="text-primary font-medium">Sign up</ULink>.
                </template>
                <template #validation>
                    <UAlert
                        v-if="signIn.error.value"
                        color="error"
                        icon="i-lucide-circle-alert"
                        :description="signIn.error.value.message"
                    />
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
