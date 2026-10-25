<script setup lang="ts">
const { user, loggedIn, signOut } = useUserSession();
// The active organization (Better Auth's Organization plugin), from the module.
const { organization } = useActiveOrganization();
</script>

<template>
    <UContainer class="flex flex-col items-start gap-4 py-16">
        <h1 class="text-xl font-semibold">nuxt-better-auth-ui playground</h1>
        <p v-if="loggedIn && user" class="text-muted">Signed in as {{ user.email }} ({{ user.role ?? 'user' }}).</p>
        <!-- The module's organization switcher, as an app's header would show it. -->
        <div v-if="loggedIn" class="flex items-center gap-2">
            <AuthOrganizationSwitcher />
            <span v-if="organization" class="text-sm text-muted">{{ organization.members.length }} members</span>
        </div>
        <div class="flex gap-2">
            <UButton to="/admin" label="Admin" icon="i-lucide-shield" />
            <UButton v-if="loggedIn" to="/account" label="Account" color="neutral" variant="outline" />
            <UButton v-if="loggedIn" label="Sign out" color="neutral" variant="outline" @click="signOut()" />
            <UButton v-else to="/login" label="Sign in" color="neutral" variant="outline" />
        </div>
    </UContainer>
</template>
