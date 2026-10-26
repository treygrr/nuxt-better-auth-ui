<script setup lang="ts">
import {
    computed,
    reactive,
    ref,
    useBetterAuthAdminCan,
    useBetterAuthAdminUsers,
    useAuthI18n,
    useFetch,
    useToast
} from '#imports';
import { upperFirst } from 'scule';

import { ADMIN_API } from '../../../constants';
import type { AdminUserField } from '../../../server/api/user-fields.get';
import type { AdminUser } from '../../types';

/**
 * The app's own user fields (Better Auth's `user.additionalFields`), eg a company, a plan or a gamertag: shown, and
 * edited through Better Auth's admin update-user. Server-owned fields (`input: false`) are shown, not edited.
 */
const props = defineProps<{ user: AdminUser }>();
const emit = defineEmits<{ updated: [] }>();

const { t } = useAuthI18n();
const toast = useToast();
const users = useBetterAuthAdminUsers();
const canUpdate = useBetterAuthAdminCan()({ user: ['update'] });

const { data: fields } = useFetch<AdminUserField[]>(`${ADMIN_API}/user-fields`, {
    key: 'better-auth-ui-admin-user-fields',
    default: () => []
});
const editable = computed(() => fields.value.filter((field) => field.editable));

/** "favoriteGame" → "Favorite game". */
const label = (name: string) => upperFirst(name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase());
const valueOf = (name: string) => (props.user as unknown as Record<string, unknown>)[name];
const isEmpty = (value: unknown) => value === null || value === undefined || value === '';

// The form: text for most types, as typed; switches for booleans.
const form = reactive<Record<string, string | boolean>>({});
const editing = ref(false);
const saving = ref(false);
const toDateInput = (value: unknown) => (isEmpty(value) ? '' : new Date(value as string).toISOString().slice(0, 10));
function startEditing() {
    for (const field of editable.value) {
        const value = valueOf(field.name);
        form[field.name] =
            field.type === 'boolean'
                ? value === true
                : field.type === 'date'
                  ? toDateInput(value)
                  : Array.isArray(value)
                    ? value.join(', ')
                    : isEmpty(value)
                      ? ''
                      : String(value);
    }
    editing.value = true;
}
/** The form's text back into the field's type; empty is null. */
function parse(field: AdminUserField, input: string | boolean) {
    if (field.type === 'boolean') return input === true;
    const text = String(input).trim();
    if (!text) return null;
    if (field.type === 'number') return Number(text);
    if (field.type === 'date') return new Date(text).toISOString();
    if (field.type === 'string[]' || field.type === 'number[]') {
        const items = text
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        return field.type === 'number[]' ? items.map(Number) : items;
    }
    return text;
}
async function save() {
    saving.value = true;
    try {
        const data = Object.fromEntries(editable.value.map((field) => [field.name, parse(field, form[field.name]!)]));
        await users.update(props.user.id, data);
        toast.add({ title: t('admin.fields.saved'), color: 'success' });
        editing.value = false;
        emit('updated');
    } catch (error) {
        toast.add({ title: t('admin.fields.failed'), description: (error as Error).message, color: 'error' });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <UPageCard
        v-if="fields.length"
        :title="t('admin.fields.title')"
        :description="t('admin.fields.description')"
        variant="subtle"
    >
        <template v-if="canUpdate && editable.length" #footer>
            <UButton
                :label="t('admin.fields.edit')"
                icon="i-lucide-pencil"
                color="neutral"
                variant="outline"
                @click="startEditing"
            />
        </template>
        <dl class="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
            <template v-for="field in fields" :key="field.name">
                <dt class="text-muted">{{ label(field.name) }}</dt>
                <dd class="min-w-0 break-words">
                    <span v-if="isEmpty(valueOf(field.name))" class="text-dimmed">—</span>
                    <template v-else-if="field.type === 'boolean'">
                        {{ valueOf(field.name) ? t('admin.fields.yes') : t('admin.fields.no') }}
                    </template>
                    <NuxtTime
                        v-else-if="field.type === 'date'"
                        :datetime="valueOf(field.name) as string"
                        date-style="medium"
                    />
                    <template v-else-if="Array.isArray(valueOf(field.name))">
                        {{ (valueOf(field.name) as unknown[]).join(', ') }}
                    </template>
                    <template v-else>{{ valueOf(field.name) }}</template>
                </dd>
            </template>
        </dl>

        <UModal v-model:open="editing" :title="t('admin.fields.editTitle', { name: user.name })">
            <template #body>
                <form id="user-fields-form" class="space-y-4" @submit.prevent="save">
                    <UFormField
                        v-for="field in editable"
                        :key="field.name"
                        :label="label(field.name)"
                        :required="field.required"
                        :help="
                            field.type === 'string[]' || field.type === 'number[]'
                                ? t('admin.fields.commaSeparated')
                                : undefined
                        "
                    >
                        <USwitch v-if="field.type === 'boolean'" v-model="form[field.name] as boolean" />
                        <USelect
                            v-else-if="Array.isArray(field.type)"
                            v-model="form[field.name] as string"
                            :items="field.type"
                            class="w-full"
                        />
                        <UInput
                            v-else
                            v-model="form[field.name] as string"
                            :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
                            :required="field.required"
                            class="w-full"
                        />
                    </UFormField>
                </form>
            </template>
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton
                        :label="t('admin.common.cancel')"
                        color="neutral"
                        variant="subtle"
                        @click="editing = false"
                    />
                    <UButton type="submit" form="user-fields-form" :label="t('admin.common.save')" :loading="saving" />
                </div>
            </template>
        </UModal>
    </UPageCard>
</template>
