<script setup lang="ts">
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, ref, useAuthCapabilities, useAuthI18n, useFetch } from '#imports';
import { upperFirst } from 'scule';

import { fieldLabel, isEmptyValue, toFieldInput } from '../../utils/fields';
import { splitRoles, useOrganizationActions } from '../../utils/organization';

/**
 * An organization's members, a page at a time (Better Auth's list-members): their roles (several each, with
 * `member:update`), the app's member fields, and removing them (`member:delete`).
 */
const props = defineProps<{ organizationId: string; can: Record<string, boolean>; roleNames: string[] }>();
const emit = defineEmits<{ changed: [] }>();

const { t } = useAuthI18n();
const { user } = useUserSession();
const { capabilities } = useAuthCapabilities();
const { run } = useOrganizationActions();
const fields = computed(() => capabilities.value?.organization?.fields.member ?? []);

type Member = {
    id: string;
    userId: string;
    role: string;
    createdAt: string;
    user: { name: string; email: string; image?: string | null };
} & Record<string, unknown>;
const PAGE_SIZE = 20;
const page = ref(1);
const { data, refresh } = useFetch<{ members: Member[]; total: number }>('/api/auth/organization/list-members', {
    key: `better-auth-ui-organization-members-${props.organizationId}`,
    query: computed(() => ({
        organizationId: props.organizationId,
        limit: PAGE_SIZE,
        offset: (page.value - 1) * PAGE_SIZE,
        sortBy: 'createdAt',
        sortDirection: 'asc'
    }))
});
const roleItems = computed(() => props.roleNames.map((role) => ({ label: upperFirst(role), value: role })));

async function setRoles(member: Member, roles: string[]) {
    if (!roles.length) return;
    const done = await run(
        (organization) =>
            organization.updateMemberRole({
                memberId: member.id,
                role: roles.length === 1 ? roles[0]! : roles,
                organizationId: props.organizationId
            }),
        t('organization.members.roleChanged', { name: member.user.name })
    );
    await refresh();
    if (done) emit('changed');
}
async function remove(member: Member) {
    const done = await run(
        (organization) =>
            organization.removeMember({ memberIdOrEmail: member.id, organizationId: props.organizationId }),
        t('organization.members.removed', { name: member.user.name })
    );
    if (!done) return;
    await refresh();
    emit('changed');
}
</script>

<template>
    <UPageCard
        :title="t('organization.members.title', { count: data?.total ?? 0 })"
        :description="t('organization.members.description')"
        variant="subtle"
    >
        <ul class="divide-y divide-default">
            <li
                v-for="member in data?.members ?? []"
                :key="member.id"
                class="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
                <UAvatar :src="member.user.image ?? undefined" :alt="member.user.name" size="md" />
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-highlighted truncate">
                        {{ member.user.name }}
                        <span v-if="member.userId === user?.id" class="text-muted font-normal">
                            ({{ t('organization.you') }})
                        </span>
                    </p>
                    <p class="text-xs text-muted truncate">{{ member.user.email }}</p>
                    <p v-for="field in fields" :key="field.name" class="text-xs text-muted">
                        {{ fieldLabel(field.name) }}:
                        {{ isEmptyValue(member[field.name]) ? '—' : toFieldInput(field, member[field.name]) }}
                    </p>
                </div>
                <USelectMenu
                    v-if="can['member:update'] && member.userId !== user?.id"
                    :model-value="splitRoles(member.role)"
                    :items="roleItems"
                    value-key="value"
                    multiple
                    size="sm"
                    class="w-44"
                    :aria-label="t('organization.members.roles', { name: member.user.name })"
                    @update:model-value="(roles) => setRoles(member, roles as string[])"
                />
                <div v-else class="flex flex-wrap gap-1">
                    <UBadge
                        v-for="role in splitRoles(member.role)"
                        :key="role"
                        :label="upperFirst(role)"
                        color="neutral"
                        variant="subtle"
                    />
                </div>
                <UButton
                    v-if="can['member:delete'] && member.userId !== user?.id"
                    icon="i-lucide-user-minus"
                    color="error"
                    variant="ghost"
                    size="sm"
                    :aria-label="t('organization.members.remove', { name: member.user.name })"
                    loading-auto
                    @click="remove(member)"
                />
            </li>
        </ul>
        <template v-if="(data?.total ?? 0) > PAGE_SIZE" #footer>
            <UPagination v-model:page="page" :items-per-page="PAGE_SIZE" :total="data?.total ?? 0" />
        </template>
    </UPageCard>
</template>
