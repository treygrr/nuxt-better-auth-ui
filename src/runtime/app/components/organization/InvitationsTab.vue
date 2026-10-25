<script setup lang="ts">
import { computed, reactive, ref, useAuthCapabilities, useAuthI18n, useRuntimeConfig, useToast } from '#imports';
import { upperFirst } from 'scule';

import { fieldValues } from '../../utils/fields';
import { splitRoles, useOrganizationActions } from '../../utils/organization';
import FieldInputs from './FieldInputs.vue';

/**
 * Inviting people (`invitation:create`): their email, roles, a team (with teams on) and the app's invitation fields.
 * Then the invitations waiting for an answer: send again, copy the link, cancel (`invitation:cancel`).
 */
const props = defineProps<{
    organizationId: string;
    invitations: Array<{
        id: string;
        email: string;
        role: string;
        status: string;
        expiresAt: string;
        teamId?: string | null;
    }>;
    teams: Array<{ id: string; name: string }>;
    can: Record<string, boolean>;
    roleNames: string[];
}>();
const emit = defineEmits<{ changed: [] }>();

const { t } = useAuthI18n();
const toast = useToast();
const { capabilities } = useAuthCapabilities();
const { invitationPage } = useRuntimeConfig().public.betterAuthUi as { invitationPage: string | false };
const { run } = useOrganizationActions();
const fields = computed(() => capabilities.value?.organization?.fields.invitation ?? []);
const pending = computed(() => props.invitations.filter((invitation) => invitation.status === 'pending'));
const roleItems = computed(() => props.roleNames.map((role) => ({ label: upperFirst(role), value: role })));
const teamItems = computed(() => props.teams.map((team) => ({ label: team.name, value: team.id })));
const teamName = (id: string | null | undefined) => props.teams.find((team) => team.id === id)?.name;

const form = reactive<{ email: string; roles: string[]; teamId: string | undefined }>({
    email: '',
    roles: ['member'],
    teamId: undefined
});
const extra = ref<Record<string, string | boolean>>({});
const sending = ref(false);
const asRole = (roles: string[]) => (roles.length === 1 ? roles[0]! : roles);

async function invite() {
    sending.value = true;
    const email = form.email.trim();
    const done = await run(
        (organization) =>
            organization.inviteMember({
                email,
                role: asRole(form.roles),
                organizationId: props.organizationId,
                ...(form.teamId && { teamId: form.teamId }),
                ...fieldValues(fields.value, extra.value)
            }),
        t('organization.invitations.sent', { email })
    );
    sending.value = false;
    if (!done) return;
    form.email = '';
    emit('changed');
}
/** Better Auth's invite again, which sends the email again rather than refusing a second invitation. */
async function resend(invitation: (typeof pending.value)[number]) {
    await run(
        (organization) =>
            organization.inviteMember({
                email: invitation.email,
                role: asRole(splitRoles(invitation.role)),
                organizationId: props.organizationId,
                resend: true,
                ...(invitation.teamId && { teamId: invitation.teamId })
            }),
        t('organization.invitations.resent', { email: invitation.email })
    );
    emit('changed');
}
async function cancel(invitationId: string) {
    if (
        await run(
            (organization) => organization.cancelInvitation({ invitationId }),
            t('organization.invitations.cancelled')
        )
    ) {
        emit('changed');
    }
}
async function copyLink(invitationId: string) {
    await navigator.clipboard.writeText(`${location.origin}${invitationPage}/${invitationId}`);
    toast.add({ title: t('organization.invitations.linkCopied'), color: 'success' });
}
</script>

<template>
    <div class="space-y-6">
        <UPageCard
            v-if="can['invitation:create']"
            :title="t('organization.invitations.inviteTitle')"
            :description="t('organization.invitations.inviteDescription')"
            variant="subtle"
        >
            <form class="space-y-4" @submit.prevent="invite">
                <UFormField :label="t('organization.invitations.email')" required>
                    <UInput v-model="form.email" type="email" required class="w-full" />
                </UFormField>
                <UFormField :label="t('organization.invitations.roles')" required>
                    <USelectMenu v-model="form.roles" :items="roleItems" value-key="value" multiple class="w-full" />
                </UFormField>
                <UFormField v-if="teams.length" :label="t('organization.invitations.team')">
                    <USelect
                        v-model="form.teamId"
                        :items="teamItems"
                        :placeholder="t('organization.invitations.noTeam')"
                        class="w-full"
                    />
                </UFormField>
                <FieldInputs v-model="extra" :fields="fields" />
                <div class="flex justify-end">
                    <UButton
                        type="submit"
                        :label="t('organization.invitations.send')"
                        icon="i-lucide-send"
                        :loading="sending"
                        :disabled="!form.email.trim() || !form.roles.length"
                    />
                </div>
            </form>
        </UPageCard>

        <UPageCard :title="t('organization.invitations.pendingTitle')" variant="subtle">
            <p v-if="!pending.length" class="text-sm text-muted">{{ t('organization.invitations.none') }}</p>
            <ul v-else class="divide-y divide-default">
                <li
                    v-for="invitation in pending"
                    :key="invitation.id"
                    class="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                    <UIcon name="i-lucide-mail" class="size-5 shrink-0 text-muted" />
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-highlighted truncate">{{ invitation.email }}</p>
                        <p class="text-xs text-muted">
                            {{ splitRoles(invitation.role).map(upperFirst).join(', ') }}
                            <template v-if="teamName(invitation.teamId)"> · {{ teamName(invitation.teamId) }}</template>
                            · {{ t('organization.invitations.expires') }}
                            <NuxtTime :datetime="invitation.expiresAt" date-style="medium" />
                        </p>
                    </div>
                    <UButton
                        v-if="invitationPage"
                        icon="i-lucide-link"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        :aria-label="t('organization.invitations.copyLink')"
                        @click="copyLink(invitation.id)"
                    />
                    <UButton
                        v-if="can['invitation:create']"
                        :label="t('organization.invitations.resend')"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        loading-auto
                        @click="resend(invitation)"
                    />
                    <UButton
                        v-if="can['invitation:cancel']"
                        :label="t('organization.invitations.cancel')"
                        color="error"
                        variant="ghost"
                        size="sm"
                        loading-auto
                        @click="cancel(invitation.id)"
                    />
                </li>
            </ul>
        </UPageCard>
    </div>
</template>
