<script setup lang="ts">
import { useAuthClient, useUserSession } from '@nuxtjs/better-auth/composables';
import { $fetch, computed, reactive, ref, useAuthI18n, useRuntimeConfig, useToast, watch } from '#imports';
import { upperFirst } from 'scule';

/**
 * One organization, through Better Auth's Organization plugin: its members and their roles, invitations (sent by
 * email, or as a link to copy), leaving it and deleting it. Owners and admins manage it (Better Auth's default roles);
 * Better Auth checks every change.
 */
const props = defineProps<{ organizationId: string }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ changed: []; left: [] }>();

const { t, errorMessage } = useAuthI18n();
const toast = useToast();
const { user } = useUserSession();
const { invitationPage } = useRuntimeConfig().public.betterAuthUi as { invitationPage: string | false };

type Member = {
    id: string;
    userId: string;
    role: string;
    user: { name: string; email: string; image?: string | null };
};
type Invitation = { id: string; email: string; role: string; status: string; expiresAt: string };
type FullOrganization = { id: string; name: string; slug: string; members: Member[]; invitations: Invitation[] };

const organization = ref<FullOrganization | null>(null);
const loadError = ref<string | null>(null);
async function load() {
    try {
        organization.value = await $fetch<FullOrganization>('/api/auth/organization/get-full-organization', {
            query: { organizationId: props.organizationId }
        });
        loadError.value = null;
    } catch (error) {
        loadError.value = (error as { data?: { message?: string } }).data?.message ?? (error as Error).message;
    }
}
watch(open, (isOpen) => isOpen && load(), { immediate: true });

const roles = (role: string) => role.split(',').map((item) => item.trim());
const me = computed(() => organization.value?.members.find((member) => member.userId === user.value?.id));
const isOwner = computed(() => !!me.value && roles(me.value.role).includes('owner'));
const canManage = computed(() => isOwner.value || (!!me.value && roles(me.value.role).includes('admin')));
const roleItems = computed(() =>
    ['member', 'admin', ...(isOwner.value ? ['owner'] : [])].map((role) => ({ label: upperFirst(role), value: role }))
);
const pending = computed(() => organization.value?.invitations.filter((item) => item.status === 'pending') ?? []);

type Result = Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
type OrganizationClient = {
    organization: {
        inviteMember(input: { email: string; role: string; organizationId: string }): Result;
        cancelInvitation(input: { invitationId: string }): Result;
        updateMemberRole(input: { memberId: string; role: string; organizationId: string }): Result;
        removeMember(input: { memberIdOrEmail: string; organizationId: string }): Result;
        leave(input: { organizationId: string }): Result;
        delete(input: { organizationId: string }): Result;
    };
};
const client = () => (useAuthClient() as unknown as OrganizationClient).organization;
/** Runs a Better Auth call, then reloads; false when it failed (and said so). */
async function run(call: () => Result, done?: string) {
    const { error } = await call();
    if (error) {
        toast.add({ title: t('account.organizations.failed'), description: errorMessage(error), color: 'error' });
        return false;
    }
    if (done) toast.add({ title: done, color: 'success' });
    await load();
    emit('changed');
    return true;
}

const invite = reactive({ email: '', role: 'member' });
const inviting = ref(false);
async function sendInvite() {
    inviting.value = true;
    const sent = await run(
        () =>
            client().inviteMember({
                email: invite.email.trim(),
                role: invite.role,
                organizationId: props.organizationId
            }),
        t('account.organizations.invited', { email: invite.email.trim() })
    );
    inviting.value = false;
    if (sent) invite.email = '';
}
async function copyLink(invitation: Invitation) {
    await navigator.clipboard.writeText(`${location.origin}${invitationPage}/${invitation.id}`);
    toast.add({ title: t('account.organizations.linkCopied'), color: 'success' });
}

const confirming = ref<'leave' | 'delete' | null>(null);
const confirmOpen = computed({
    get: () => confirming.value !== null,
    set: (value) => {
        if (!value) confirming.value = null;
    }
});
async function confirmed() {
    const leaving = confirming.value === 'leave';
    const ok = await run(() =>
        leaving
            ? client().leave({ organizationId: props.organizationId })
            : client().delete({ organizationId: props.organizationId })
    );
    if (!ok) return;
    toast.add({
        title: leaving
            ? t('account.organizations.left', { name: organization.value?.name ?? '' })
            : t('account.organizations.deleted', { name: organization.value?.name ?? '' }),
        color: 'success'
    });
    confirming.value = null;
    open.value = false;
    emit('left');
}
</script>

<template>
    <UModal
        v-model:open="open"
        :title="organization?.name ?? t('account.organizations.title')"
        :ui="{ content: 'max-w-2xl' }"
    >
        <template #body>
            <UAlert v-if="loadError" color="error" icon="i-lucide-circle-alert" :description="loadError" />
            <USkeleton v-else-if="!organization" class="h-40 w-full" />
            <div v-else class="space-y-6">
                <!-- Members. -->
                <section class="space-y-3">
                    <h3 class="text-sm font-semibold text-highlighted">
                        {{ t('account.organizations.members', { count: organization.members.length }) }}
                    </h3>
                    <ul class="divide-y divide-default">
                        <li
                            v-for="member in organization.members"
                            :key="member.id"
                            class="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                            <UAvatar :src="member.user.image ?? undefined" :alt="member.user.name" size="sm" />
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-medium text-highlighted truncate">
                                    {{ member.user.name }}
                                    <span v-if="member.userId === user?.id" class="text-muted font-normal">
                                        ({{ t('account.organizations.you') }})
                                    </span>
                                </p>
                                <p class="text-xs text-muted truncate">{{ member.user.email }}</p>
                            </div>
                            <USelect
                                v-if="canManage && member.userId !== user?.id"
                                :model-value="roles(member.role)[0]"
                                :items="roleItems"
                                size="sm"
                                class="w-28"
                                :aria-label="t('account.organizations.role')"
                                @update:model-value="
                                    (role) =>
                                        run(
                                            () =>
                                                client().updateMemberRole({
                                                    memberId: member.id,
                                                    role: role as string,
                                                    organizationId: organizationId
                                                }),
                                            t('account.organizations.roleChanged')
                                        )
                                "
                            />
                            <UBadge v-else :label="upperFirst(member.role)" color="neutral" variant="subtle" />
                            <UButton
                                v-if="canManage && member.userId !== user?.id"
                                icon="i-lucide-user-minus"
                                color="error"
                                variant="ghost"
                                size="sm"
                                :aria-label="t('account.organizations.remove', { name: member.user.name })"
                                loading-auto
                                @click="
                                    run(
                                        () => client().removeMember({ memberIdOrEmail: member.id, organizationId }),
                                        t('account.organizations.removed', { name: member.user.name })
                                    )
                                "
                            />
                        </li>
                    </ul>
                </section>

                <!-- Inviting, and invitations waiting for an answer. -->
                <section v-if="canManage" class="space-y-3">
                    <h3 class="text-sm font-semibold text-highlighted">{{ t('account.organizations.invite') }}</h3>
                    <form class="flex flex-wrap items-start gap-2" @submit.prevent="sendInvite">
                        <UInput
                            v-model="invite.email"
                            type="email"
                            required
                            :placeholder="t('account.organizations.inviteEmail')"
                            :aria-label="t('account.organizations.inviteEmail')"
                            class="flex-1 min-w-48"
                        />
                        <USelect
                            v-model="invite.role"
                            :items="roleItems"
                            class="w-28"
                            :aria-label="t('account.organizations.role')"
                        />
                        <UButton type="submit" :label="t('account.organizations.sendInvite')" :loading="inviting" />
                    </form>
                    <ul v-if="pending.length" class="divide-y divide-default">
                        <li
                            v-for="invitation in pending"
                            :key="invitation.id"
                            class="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                            <UIcon name="i-lucide-mail" class="size-4 shrink-0 text-muted" />
                            <div class="min-w-0 flex-1">
                                <p class="text-sm text-highlighted truncate">{{ invitation.email }}</p>
                                <p class="text-xs text-muted">
                                    {{ upperFirst(invitation.role) }} · {{ t('account.organizations.expires') }}
                                    <NuxtTime :datetime="invitation.expiresAt" date-style="medium" />
                                </p>
                            </div>
                            <UButton
                                v-if="invitationPage"
                                icon="i-lucide-link"
                                color="neutral"
                                variant="ghost"
                                size="sm"
                                :aria-label="t('account.organizations.copyLink')"
                                @click="copyLink(invitation)"
                            />
                            <UButton
                                :label="t('account.organizations.cancelInvite')"
                                color="neutral"
                                variant="ghost"
                                size="sm"
                                loading-auto
                                @click="
                                    run(
                                        () => client().cancelInvitation({ invitationId: invitation.id }),
                                        t('account.organizations.inviteCancelled')
                                    )
                                "
                            />
                        </li>
                    </ul>
                </section>
            </div>
        </template>
        <template v-if="organization" #footer>
            <div class="flex flex-wrap justify-between gap-2 w-full">
                <UButton
                    :label="t('account.organizations.leave')"
                    icon="i-lucide-log-out"
                    color="neutral"
                    variant="ghost"
                    @click="confirming = 'leave'"
                />
                <UButton
                    v-if="isOwner"
                    :label="t('account.organizations.delete')"
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="outline"
                    @click="confirming = 'delete'"
                />
            </div>
        </template>
    </UModal>

    <UModal
        v-model:open="confirmOpen"
        :title="
            confirming === 'leave'
                ? t('account.organizations.leaveTitle', { name: organization?.name ?? '' })
                : t('account.organizations.deleteTitle', { name: organization?.name ?? '' })
        "
        :description="
            confirming === 'leave'
                ? t('account.organizations.leaveDescription')
                : t('account.organizations.deleteDescription')
        "
    >
        <template #footer>
            <div class="flex justify-end gap-2 w-full">
                <UButton :label="t('common.cancel')" color="neutral" variant="subtle" @click="confirming = null" />
                <UButton
                    :label="
                        confirming === 'leave' ? t('account.organizations.leave') : t('account.organizations.delete')
                    "
                    color="error"
                    loading-auto
                    @click="confirmed"
                />
            </div>
        </template>
    </UModal>
</template>
