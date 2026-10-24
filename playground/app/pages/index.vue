<script setup lang="ts">
const { user, loggedIn, signOut } = useUserSession();
</script>

<template>
    <UContainer class="flex flex-col items-start gap-4 py-16">
        <h1 class="text-xl font-semibold">nuxt-better-auth-admin playground</h1>
        <p v-if="loggedIn && user" class="text-muted">Signed in as {{ user.email }} ({{ user.role ?? 'user' }}).</p>
        <div class="flex gap-2">
            <UButton to="/admin" label="Admin" icon="i-lucide-shield" />
            <UButton v-if="loggedIn" label="Sign out" color="neutral" variant="outline" @click="signOut()" />
            <UButton v-else to="/login" label="Sign in" color="neutral" variant="outline" />
        </div>
    </UContainer>
</template>
