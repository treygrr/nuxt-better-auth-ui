<script setup lang="ts">
import { $fetch, computed, ref, useAuthCapabilities, useAuthI18n, useFetch, watch } from '#imports';

import { ADMIN_API } from '../../../constants';
import { parseCsv } from '../../../csv';
import type { AdminUserField } from '../../../server/api/user-fields.get';

/**
 * Creates users from a CSV file: a header row naming the columns, then a user per row. Read in the browser to show what
 * will happen, then created on the server through Better Auth's createUser, which reports each row's outcome.
 */
const emit = defineEmits<{ imported: [] }>();
const { t, errorMessage } = useAuthI18n();
const { capabilities } = useAuthCapabilities();
const { data: appFields } = useFetch<AdminUserField[]>(`${ADMIN_API}/user-fields`, {
    key: 'better-auth-ui-user-fields',
    default: () => []
});

const MAX_ROWS = 1000;
const open = ref(false);
const file = ref<File | null>(null);
const sendPasswordLinks = ref(true);

/** The columns the import reads, by the header's name in any case, with or without spaces and underscores. */
const known = computed(() => {
    const columns = ['name', 'email', 'password', 'role', 'emailVerified'];
    if (capabilities.value?.username) columns.push('username');
    for (const field of appFields.value ?? []) if (field.editable) columns.push(field.name);
    return new Map(columns.map((column) => [column.toLowerCase().replace(/[\s_-]/g, ''), column]));
});

type Parsed = { columns: string[]; ignored: string[]; rows: Array<{ row: number; values: Record<string, string> }> };
const parsed = ref<Parsed | null>(null);
const parseError = ref('');
watch(file, async (value, _, onCleanup) => {
    parsed.value = null;
    parseError.value = '';
    result.value = null;
    if (!value) return;
    // Another file picked while this one was read: that one's result wins.
    let stale = false;
    onCleanup(() => (stale = true));
    const text = await value.text();
    if (stale) return;
    const [header, ...lines] = parseCsv(text);
    if (!header) {
        parseError.value = t('admin.import.empty');
        return;
    }
    const mapped = header.map(
        (name) =>
            known.value.get(
                name
                    .trim()
                    .toLowerCase()
                    .replace(/[\s_-]/g, '')
            ) ?? null
    );
    if (!mapped.includes('email')) {
        parseError.value = t('admin.import.noEmail');
        return;
    }
    // The export marks text a spreadsheet would run as a formula with a leading '; it comes off again here.
    const unescape = (text: string) => (/^'[=+\-@\t\r]/.test(text) ? text.slice(1) : text);
    parsed.value = {
        columns: mapped.filter((column): column is string => !!column),
        ignored: header.filter((_, index) => !mapped[index]),
        rows: lines.map((cells, index) => ({
            // As a spreadsheet numbers it: the header is row 1.
            row: index + 2,
            values: Object.fromEntries(
                mapped.flatMap((column, at) => (column ? [[column, unescape(cells[at] ?? '')]] : []))
            )
        }))
    };
    if (parsed.value.rows.length > MAX_ROWS) parseError.value = t('admin.import.tooMany', { count: MAX_ROWS });
});
const withoutPassword = computed(() => parsed.value?.rows.filter((row) => !row.values.password).length ?? 0);

type Outcome = { row: number; email: string; code?: string; message?: string };
const result = ref<{ created: Outcome[]; skipped: Outcome[]; failed: Outcome[]; linksSent: number } | null>(null);
const importing = ref(false);
const importError = ref<{ message?: string; code?: string } | null>(null);
async function startImport() {
    if (!parsed.value) return;
    importing.value = true;
    importError.value = null;
    try {
        const outcome = await $fetch<NonNullable<typeof result.value>>(`${ADMIN_API}/users/import`, {
            method: 'POST',
            body: {
                rows: parsed.value.rows,
                sendPasswordLinks: sendPasswordLinks.value && !!capabilities.value?.resetPassword
            }
        });
        result.value = outcome;
        if (outcome.created.length) emit('imported');
    } catch (error) {
        const data = (error as { data?: { statusMessage?: string; data?: { code?: string } } }).data;
        importError.value = { message: data?.statusMessage ?? (error as Error).message, code: data?.data?.code };
    } finally {
        importing.value = false;
    }
}
function reset() {
    file.value = null;
    result.value = null;
}
const reason = (outcome: Outcome) => errorMessage({ code: outcome.code, message: outcome.message });
/** "1 user" or "{count} users". */
const plural = (key: 'ready' | 'submit' | 'created', count: number) =>
    t(`admin.import.${key}.${count === 1 ? 'one' : 'other'}`, { count });
</script>

<template>
    <UModal
        v-model:open="open"
        :title="t('admin.import.title')"
        :description="t('admin.import.description')"
        :ui="{ content: 'max-w-2xl' }"
        @after:leave="reset"
    >
        <UButton :label="t('admin.import.button')" icon="i-lucide-upload" color="neutral" variant="outline" />

        <template #body>
            <!-- What happened to each row. -->
            <div v-if="result" class="space-y-4">
                <UAlert
                    color="success"
                    variant="subtle"
                    icon="i-lucide-check"
                    :title="plural('created', result.created.length)"
                    :description="
                        result.linksSent ? t('admin.import.linksSent', { count: result.linksSent }) : undefined
                    "
                />
                <div v-if="result.skipped.length" class="space-y-1">
                    <p class="text-sm font-medium text-highlighted">
                        {{ t('admin.import.skipped', { count: result.skipped.length }) }}
                    </p>
                    <ul class="max-h-40 overflow-y-auto text-sm text-muted">
                        <li v-for="item in result.skipped" :key="`skipped-${item.row}`">
                            {{ t('admin.import.row', { row: item.row }) }} · {{ item.email }} · {{ reason(item) }}
                        </li>
                    </ul>
                </div>
                <div v-if="result.failed.length" class="space-y-1">
                    <p class="text-sm font-medium text-error">
                        {{ t('admin.import.failed', { count: result.failed.length }) }}
                    </p>
                    <ul class="max-h-40 overflow-y-auto text-sm text-muted">
                        <li v-for="item in result.failed" :key="`failed-${item.row}`">
                            {{ t('admin.import.row', { row: item.row }) }} · {{ item.email || '—' }} ·
                            {{ reason(item) }}
                        </li>
                    </ul>
                </div>
            </div>

            <div v-else class="space-y-4">
                <p class="text-sm text-muted">
                    {{ t('admin.import.columns') }}
                    <code class="text-xs">{{ [...known.values()].join(', ') }}</code>
                </p>
                <UFileUpload
                    v-model="file"
                    accept=".csv,text/csv"
                    :label="t('admin.import.drop')"
                    :description="t('admin.import.dropHint', { count: MAX_ROWS })"
                    icon="i-lucide-file-spreadsheet"
                    layout="list"
                    class="w-full min-h-32"
                />
                <UAlert v-if="parseError" color="error" icon="i-lucide-circle-alert" :title="parseError" />
                <template v-else-if="parsed">
                    <p class="text-sm text-highlighted">
                        {{ plural('ready', parsed.rows.length) }}
                    </p>
                    <p v-if="parsed.ignored.length" class="text-sm text-muted">
                        {{ t('admin.import.ignored', { columns: parsed.ignored.join(', ') }) }}
                    </p>
                    <UCheckbox
                        v-if="capabilities?.resetPassword && withoutPassword"
                        v-model="sendPasswordLinks"
                        :label="t('admin.import.sendLinks', { count: withoutPassword })"
                    />
                </template>
                <UAlert
                    v-if="importError"
                    color="error"
                    icon="i-lucide-circle-alert"
                    :title="t('admin.import.importFailed')"
                    :description="errorMessage(importError)"
                />
            </div>
        </template>

        <template #footer>
            <div class="flex justify-end gap-2 w-full">
                <template v-if="result">
                    <UButton :label="t('admin.import.another')" color="neutral" variant="subtle" @click="reset" />
                    <UButton :label="t('admin.import.done')" @click="open = false" />
                </template>
                <template v-else>
                    <UButton :label="t('common.cancel')" color="neutral" variant="subtle" @click="open = false" />
                    <UButton
                        :label="plural('submit', parsed?.rows.length ?? 0)"
                        icon="i-lucide-upload"
                        :loading="importing"
                        :disabled="!parsed || !!parseError || !parsed.rows.length"
                        @click="startImport"
                    />
                </template>
            </div>
        </template>
    </UModal>
</template>
