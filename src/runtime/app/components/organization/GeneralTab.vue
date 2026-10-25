<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { useUserSession } from '@nuxtjs/better-auth/composables';
import { computed, navigateTo, reactive, ref, useAuthCapabilities, useAuthI18n, useAuthPages, watch } from '#imports';

import { fieldLabel, fieldValues, isEmptyValue, toFieldInput } from '../../utils/fields';
import { useOrganizationActions } from '../../utils/organization';
import FieldInputs from './FieldInputs.vue';

/**
 * An organization's details (name, slug, logo, the app's fields), editable with `organization:update`, then leaving it
 * and (with `organization:delete`, when the app allows deleting) deleting it.
 */
const props = defineProps<{
    organization: { id: string; name: string; slug: string; logo?: string | null } & Record<string, unknown>;
    can: Record<string, boolean>;
}>();
const emit = defineEmits<{ changed: [] }>();

const { t } = useAuthI18n();
const pages = useAuthPages();
const { capabilities } = useAuthCapabilities();
const { fetchSession } = useUserSession();
const { client, run } = useOrganizationActions();
const fields = computed(() => capabilities.value?.organization?.fields.organization ?? []);

const form = reactive({ name: '', slug: '', logo: '' });
const extra = ref<Record<string, string | boolean>>({});
function reset() {
    Object.assign(form, {
        name: props.organization.name,
        slug: props.organization.slug,
        logo: props.organization.logo ?? ''
    });
    extra.value = Object.fromEntries(
        fields.value.map((field) => [field.name, toFieldInput(field, props.organization[field.name])])
    );
}
watch(() => props.organization, reset, { immediate: true });

// Whether the slug is free, asked of Better Auth as they type (their own is, of course).
const slug = refDebounced(
    computed(() => form.slug),
    400
);
const slugTaken = ref(false);
watch(slug, async (value) => {
    if (!value || value === props.organization.slug) {
        slugTaken.value = false;
        return;
    }
    const { error } = await client().checkSlug({ slug: value });
    slugTaken.value = !!error;
});

const saving = ref(false);
async function save() {
    saving.value = true;
    const saved = await run(
        (organization) =>
            organization.update({
                organizationId: props.organization.id,
                data: {
                    name: form.name.trim(),
                    slug: form.slug,
                    logo: form.logo.trim() || undefined,
                    ...fieldValues(fields.value, extra.value)
                }
            }),
        t('organization.general.saved')
    );
    saving.value = false;
    if (saved) emit('changed');
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
    const done = await run(
        (organization) =>
            leaving
                ? organization.leave({ organizationId: props.organization.id })
                : organization.delete({ organizationId: props.organization.id }),
        leaving
            ? t('organization.general.left', { name: props.organization.name })
            : t('organization.general.deleted', { name: props.organization.name })
    );
    if (!done) return;
    confirming.value = null;
    await fetchSession({ force: true });
    await navigateTo(pages.account ? `${pages.account}?tab=organizations` : '/');
}
</script>

<template>
    <div class="space-y-6">
        <UPageCard :title="t('organization.general.title')" variant="subtle">
            <form v-if="can['organization:update']" class="space-y-4" @submit.prevent="save">
                <UFormField :label="t('organization.general.name')" required>
                    <UInput v-model="form.name" required class="w-full" />
                </UFormField>
                <UFormField
                    :label="t('organization.general.slug')"
                    :help="t('organization.slugHelp')"
                    :error="slugTaken ? t('organization.slugTaken') : undefined"
                    required
                >
                    <UInput v-model="form.slug" required pattern="[a-z0-9\-]+" class="w-full" />
                </UFormField>
                <UFormField :label="t('organization.general.logo')" :help="t('organization.general.logoHelp')">
                    <UInput v-model="form.logo" type="url" placeholder="https://" class="w-full" />
                </UFormField>
                <FieldInputs v-model="extra" :fields="fields" />
                <div class="flex justify-end">
                    <UButton type="submit" :label="t('common.save')" :loading="saving" :disabled="slugTaken" />
                </div>
            </form>
            <dl v-else class="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
                <dt class="text-muted">{{ t('organization.general.name') }}</dt>
                <dd>{{ organization.name }}</dd>
                <dt class="text-muted">{{ t('organization.general.slug') }}</dt>
                <dd>{{ organization.slug }}</dd>
                <template v-for="field in fields" :key="field.name">
                    <dt class="text-muted">{{ fieldLabel(field.name) }}</dt>
                    <dd>
                        {{
                            isEmptyValue(organization[field.name]) ? '—' : toFieldInput(field, organization[field.name])
                        }}
                    </dd>
                </template>
            </dl>
        </UPageCard>

        <UPageCard :title="t('organization.general.leaveTitle')" variant="subtle">
            <div class="flex flex-wrap gap-2">
                <UButton
                    :label="t('organization.general.leave')"
                    icon="i-lucide-log-out"
                    color="neutral"
                    variant="outline"
                    @click="confirming = 'leave'"
                />
                <UButton
                    v-if="can['organization:delete'] && capabilities?.organization?.deletion"
                    :label="t('organization.general.delete')"
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="outline"
                    @click="confirming = 'delete'"
                />
            </div>
        </UPageCard>

        <UModal
            v-model:open="confirmOpen"
            :title="
                confirming === 'leave'
                    ? t('organization.general.leaveConfirm', { name: organization.name })
                    : t('organization.general.deleteConfirm', { name: organization.name })
            "
            :description="
                confirming === 'leave'
                    ? t('organization.general.leaveDescription')
                    : t('organization.general.deleteDescription')
            "
        >
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton :label="t('common.cancel')" color="neutral" variant="subtle" @click="confirming = null" />
                    <UButton
                        :label="
                            confirming === 'leave' ? t('organization.general.leave') : t('organization.general.delete')
                        "
                        color="error"
                        loading-auto
                        @click="confirmed"
                    />
                </div>
            </template>
        </UModal>
    </div>
</template>
