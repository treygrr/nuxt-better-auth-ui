<script setup lang="ts">
import { useAuthClient, useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, navigateTo, ref, useAuthI18n, useAuthPages, useFetch, useRoute, useSeoMeta } from '#imports';
import { upperFirst } from 'scule';

/**
 * An organization invitation (Better Auth's Organization plugin), from its email's link: who invited them, to which
 * organization and as what, then accept or decline. Signed in only; it's for the invitation's own email.
 */
const { t, errorMessage } = useAuthI18n();
useSeoMeta({ title: () => t('invitation.title') });
const pages = useAuthPages();
const { fetchSession } = useUserSession();
const id = useRoute().params.id as string;

type Invitation = {
    id: string;
    organizationName: string;
    inviterEmail: string;
    role: string;
    status: string;
    expiresAt: string;
};
// Better Auth's own GET endpoint, server-rendered with the visitor's cookies.
const { data: invitation, error } = await useFetch<Invitation>('/api/auth/organization/get-invitation', {
    query: { id }
});
const problem = computed(() =>
    error.value ? errorMessage((error.value.data ?? {}) as { message?: string; code?: string }) : null
);

type Result = Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
type OrganizationClient = {
    organization: {
        acceptInvitation(input: { invitationId: string }): Result;
        rejectInvitation(input: { invitationId: string }): Result;
    };
};
const outcome = ref<'accepted' | 'declined' | null>(null);
const actionError = ref<string | null>(null);
async function answer(accept: boolean) {
    const client = (useAuthClient() as unknown as OrganizationClient).organization;
    const { error: failed } = accept
        ? await client.acceptInvitation({ invitationId: id })
        : await client.rejectInvitation({ invitationId: id });
    actionError.value = failed ? errorMessage(failed) : null;
    if (failed) return;
    outcome.value = accept ? 'accepted' : 'declined';
    if (accept) await fetchSession({ force: true });
}
const organizationsTab = computed(() => (pages.account ? `${pages.account}?tab=organizations` : '/'));
</script>

<template>
    <UContainer class="flex justify-center py-16">
        <UPageCard class="w-full max-w-md">
            <div v-if="outcome" class="space-y-4 text-center">
                <UIcon
                    :name="outcome === 'accepted' ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
                    class="size-10 mx-auto"
                    :class="outcome === 'accepted' ? 'text-success' : 'text-muted'"
                />
                <h1 class="text-xl font-semibold text-highlighted">
                    {{
                        outcome === 'accepted'
                            ? t('invitation.joined', { name: invitation?.organizationName ?? '' })
                            : t('invitation.declined')
                    }}
                </h1>
                <UButton
                    :label="t('invitation.toOrganizations')"
                    color="neutral"
                    variant="subtle"
                    @click="navigateTo(organizationsTab)"
                />
            </div>

            <UAlert
                v-else-if="problem || !invitation"
                color="error"
                icon="i-lucide-circle-alert"
                :title="t('invitation.unavailable')"
                :description="problem ?? undefined"
            />

            <div v-else class="space-y-5">
                <div class="space-y-1 text-center">
                    <UIcon name="i-lucide-building-2" class="size-10 text-primary mx-auto" />
                    <h1 class="text-xl font-semibold text-highlighted">
                        {{ t('invitation.heading', { name: invitation.organizationName }) }}
                    </h1>
                    <p class="text-muted">
                        {{
                            t('invitation.description', {
                                inviter: invitation.inviterEmail,
                                role: upperFirst(invitation.role)
                            })
                        }}
                    </p>
                </div>
                <UAlert
                    v-if="invitation.status !== 'pending'"
                    color="neutral"
                    variant="subtle"
                    icon="i-lucide-info"
                    :description="t('invitation.answered')"
                />
                <UAlert v-if="actionError" color="error" icon="i-lucide-circle-alert" :description="actionError" />
                <div v-if="invitation.status === 'pending'" class="flex justify-end gap-2">
                    <UButton
                        :label="t('invitation.decline')"
                        color="neutral"
                        variant="outline"
                        loading-auto
                        @click="answer(false)"
                    />
                    <UButton :label="t('invitation.accept')" loading-auto @click="answer(true)" />
                </div>
            </div>
        </UPageCard>
    </UContainer>
</template>
