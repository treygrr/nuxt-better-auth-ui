<script setup lang="ts">
import { computed, reactive, ref, useAuthCapabilities, useAuthI18n } from '#imports';
import { upperFirst } from 'scule';

import { parsePermissions, useOrganizationActions } from '../../utils/organization';

/**
 * An organization's roles: the app's (Better Auth's owner, admin and member, and its own), with their permissions, and,
 * with dynamic roles on, the organization's own: created, edited and deleted (`ac:create`, `ac:update`, `ac:delete`)
 * with a grid of every resource's actions. Better Auth refuses permissions the editor doesn't have themselves.
 */
const props = defineProps<{
    organizationId: string;
    can: Record<string, boolean>;
    dynamicRoles: Array<{ id: string; role: string; permission: unknown }>;
}>();
const emit = defineEmits<{ changed: [] }>();

const { t } = useAuthI18n();
const { capabilities } = useAuthCapabilities();
const { run } = useOrganizationActions();
const statements = computed(() => capabilities.value?.organization?.statements ?? {});
const staticRoles = computed(() =>
    (capabilities.value?.organization?.roles ?? []).map((role) => ({
        role,
        permissions: capabilities.value?.organization?.rolePermissions[role] ?? {}
    }))
);
const permissionList = (permissions: Record<string, string[]>) =>
    Object.entries(permissions).flatMap(([resource, actions]) => actions.map((action) => `${resource}:${action}`));

// Creating or editing a role: its name and a checkbox per resource and action.
const editing = ref<{ id: string | null } | null>(null);
const open = computed({
    get: () => editing.value !== null,
    set: (value) => {
        if (!value) editing.value = null;
    }
});
const form = reactive<{ name: string; permissions: Record<string, string[]> }>({ name: '', permissions: {} });
function start(role?: (typeof props.dynamicRoles)[number]) {
    form.name = role?.role ?? '';
    const current = role ? parsePermissions(role.permission) : {};
    form.permissions = Object.fromEntries(
        Object.keys(statements.value).map((resource) => [resource, [...(current[resource] ?? [])]])
    );
    editing.value = { id: role?.id ?? null };
}
/** Only resources with an action ticked. */
const chosen = () => Object.fromEntries(Object.entries(form.permissions).filter(([, actions]) => actions.length));
const saving = ref(false);
async function save() {
    saving.value = true;
    const id = editing.value?.id;
    const done = await run(
        (organization) =>
            id
                ? organization.updateRole({
                      roleId: id,
                      organizationId: props.organizationId,
                      data: { roleName: form.name.trim(), permission: chosen() }
                  })
                : organization.createRole({
                      role: form.name.trim(),
                      permission: chosen(),
                      organizationId: props.organizationId
                  }),
        id ? t('organization.roles.updated') : t('organization.roles.created', { name: form.name.trim() })
    );
    saving.value = false;
    if (!done) return;
    editing.value = null;
    emit('changed');
}
async function remove(role: (typeof props.dynamicRoles)[number]) {
    if (
        await run(
            (organization) => organization.deleteRole({ roleId: role.id, organizationId: props.organizationId }),
            t('organization.roles.deleted', { name: role.role })
        )
    ) {
        emit('changed');
    }
}
</script>

<template>
    <div class="space-y-6">
        <UPageCard
            :title="t('organization.roles.staticTitle')"
            :description="t('organization.roles.staticDescription')"
            variant="subtle"
        >
            <ul class="divide-y divide-default">
                <li v-for="item in staticRoles" :key="item.role" class="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <p class="text-sm font-medium text-highlighted">{{ upperFirst(item.role) }}</p>
                    <div class="flex flex-wrap gap-1">
                        <UBadge
                            v-for="permission in permissionList(item.permissions)"
                            :key="permission"
                            :label="permission"
                            color="neutral"
                            variant="subtle"
                            size="sm"
                        />
                        <span v-if="!permissionList(item.permissions).length" class="text-xs text-muted">
                            {{ t('organization.roles.readOnly') }}
                        </span>
                    </div>
                </li>
            </ul>
        </UPageCard>

        <UPageCard
            v-if="capabilities?.organization?.dynamicRoles && can['ac:read']"
            :title="t('organization.roles.dynamicTitle')"
            :description="t('organization.roles.dynamicDescription')"
            variant="subtle"
        >
            <p v-if="!dynamicRoles.length" class="text-sm text-muted">{{ t('organization.roles.none') }}</p>
            <ul v-else class="divide-y divide-default">
                <li
                    v-for="role in dynamicRoles"
                    :key="role.id"
                    class="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                    <div class="min-w-0 flex-1 space-y-1.5">
                        <p class="text-sm font-medium text-highlighted">{{ upperFirst(role.role) }}</p>
                        <div class="flex flex-wrap gap-1">
                            <UBadge
                                v-for="permission in permissionList(parsePermissions(role.permission))"
                                :key="permission"
                                :label="permission"
                                color="neutral"
                                variant="subtle"
                                size="sm"
                            />
                        </div>
                    </div>
                    <UButton
                        v-if="can['ac:update']"
                        :label="t('organization.roles.edit')"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        @click="start(role)"
                    />
                    <UButton
                        v-if="can['ac:delete']"
                        :label="t('organization.roles.delete')"
                        color="error"
                        variant="ghost"
                        size="sm"
                        loading-auto
                        @click="remove(role)"
                    />
                </li>
            </ul>
            <template v-if="can['ac:create']" #footer>
                <UButton :label="t('organization.roles.create')" icon="i-lucide-plus" @click="start()" />
            </template>
        </UPageCard>

        <UModal
            v-model:open="open"
            :title="editing?.id ? t('organization.roles.editTitle') : t('organization.roles.createTitle')"
            :description="t('organization.roles.grantHint')"
            :ui="{ content: 'max-w-2xl' }"
        >
            <template #body>
                <form id="organization-role-form" class="space-y-4" @submit.prevent="save">
                    <UFormField :label="t('organization.roles.name')" :help="t('organization.roles.nameHelp')" required>
                        <UInput v-model="form.name" required pattern="[A-Za-z0-9_\-]+" class="w-full" />
                    </UFormField>
                    <div class="divide-y divide-default">
                        <div
                            v-for="(actions, resource) in statements"
                            :key="resource"
                            class="flex flex-wrap items-center gap-x-4 gap-y-2 py-2"
                        >
                            <span class="w-28 text-sm font-medium text-highlighted">{{ resource }}</span>
                            <UCheckboxGroup
                                v-model="form.permissions[resource]"
                                :items="actions"
                                orientation="horizontal"
                                :aria-label="resource"
                            />
                        </div>
                    </div>
                </form>
            </template>
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton :label="t('common.cancel')" color="neutral" variant="subtle" @click="editing = null" />
                    <UButton
                        type="submit"
                        form="organization-role-form"
                        :label="t('common.save')"
                        :loading="saving"
                        :disabled="!form.name.trim()"
                    />
                </div>
            </template>
        </UModal>
    </div>
</template>
