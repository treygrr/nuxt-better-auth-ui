<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui';

definePageMeta({ auth: 'guest' });

const fields: AuthFormField[] = [
    { name: 'name', type: 'text', label: 'Name', required: true },
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'password', type: 'password', label: 'Password', description: 'At least 8 characters.', required: true }
];

const signUp = useSignUp('email');

function onSubmit(event: FormSubmitEvent<{ name: string; email: string; password: string }>) {
    signUp.execute({ name: event.data.name, email: event.data.email, password: event.data.password });
}
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <UAuthForm
                :fields="fields"
                title="Create an account"
                icon="i-lucide-user-plus"
                :loading="signUp.status.value === 'pending'"
                :submit="{ label: 'Sign up' }"
                @submit="onSubmit"
            >
                <template #description>
                    Already have an account? <ULink to="/login" class="text-primary font-medium">Sign in</ULink>.
                </template>
                <template #validation>
                    <UAlert
                        v-if="signUp.error.value"
                        color="error"
                        icon="i-lucide-circle-alert"
                        :description="signUp.error.value.message"
                    />
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
