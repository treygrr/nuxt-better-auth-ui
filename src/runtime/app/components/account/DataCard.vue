<script setup lang="ts">
import { useAuthI18n } from '#imports';

import { UI_API } from '../../../constants';
import CardTitle from './CardTitle.vue';

/** "Download my data": a JSON file of what the app's auth keeps about them, from the module's export route. */
const { t } = useAuthI18n();
</script>

<template>
    <UPageCard :title="t('account.data.title')" :description="t('account.data.description')" variant="subtle">
        <template #title><CardTitle icon="i-lucide-file-down" :title="t('account.data.title')" /></template>
        <div>
            <UButton
                :label="t('account.data.button')"
                icon="i-lucide-download"
                color="neutral"
                variant="outline"
                :to="`${UI_API}/export`"
                external
                download="account-data.json"
            />
        </div>
    </UPageCard>
</template>
