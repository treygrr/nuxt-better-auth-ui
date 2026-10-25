<script setup lang="ts">
import { useAuthI18n } from '#imports';

import { fieldLabel, type AppField } from '../../utils/fields';

/** Inputs for the app's own fields (Better Auth's `additionalFields`): one per editable field, by its type. */
defineProps<{ fields: AppField[] }>();
const form = defineModel<Record<string, string | boolean>>({ required: true });
const { t } = useAuthI18n();
</script>

<template>
    <UFormField
        v-for="field in fields.filter((item) => item.editable)"
        :key="field.name"
        :label="fieldLabel(field.name)"
        :required="field.required"
        :help="field.type === 'string[]' || field.type === 'number[]' ? t('organization.commaSeparated') : undefined"
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
</template>
