<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import {
    computed,
    h,
    ref,
    resolveComponent,
    useBetterAuthAdminPath,
    useAuthCapabilities,
    useAuthI18n,
    useFetch,
    useSeoMeta
} from '#imports';

import { ADMIN_API } from '../../constants';
import type { AdminSsoProvider } from '../../server/api/sso-providers.get';

/**
 * Every SSO provider (Better Auth's SSO plugin), for staff: read-only. Each organization's owners and admins register
 * and change theirs from the organization's page, where Better Auth checks they may.
 */
const UBadge = resolveComponent('UBadge');
const ULink = resolveComponent('ULink');

const adminPath = useBetterAuthAdminPath();
const { t } = useAuthI18n();
const { capabilities } = useAuthCapabilities();

const { data, status, error } = await useFetch<AdminSsoProvider[]>(`${ADMIN_API}/sso-providers`, {
    default: () => []
});
const search = ref('');
const rows = computed(() => {
    const term = search.value.trim().toLowerCase();
    return (data.value ?? []).filter(
        (provider) =>
            !term ||
            [provider.providerId, provider.domain, provider.issuer, provider.organization?.name]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(term))
    );
});

const columns = computed<TableColumn<AdminSsoProvider>[]>(() => [
    {
        accessorKey: 'providerId',
        header: t('admin.sso.columns.provider'),
        cell: ({ row }) =>
            h('div', undefined, [
                h('p', { class: 'font-medium text-highlighted flex items-center gap-2' }, [
                    row.original.providerId,
                    h(UBadge, {
                        label: row.original.type === 'saml' ? 'SAML' : 'OIDC',
                        color: 'neutral',
                        variant: 'subtle',
                        size: 'sm'
                    })
                ]),
                h('p', { class: 'text-muted truncate' }, row.original.issuer)
            ])
    },
    {
        accessorKey: 'domain',
        header: t('admin.sso.columns.domain'),
        cell: ({ row }) =>
            h('div', { class: 'flex flex-wrap items-center gap-2' }, [
                row.original.domain,
                ...(capabilities.value?.sso?.domainVerification.enabled
                    ? [
                          h(UBadge, {
                              label: row.original.domainVerified ? t('admin.sso.verified') : t('admin.sso.unverified'),
                              color: row.original.domainVerified ? 'success' : 'warning',
                              variant: 'subtle',
                              size: 'sm'
                          })
                      ]
                    : [])
            ])
    },
    {
        id: 'organization',
        header: t('admin.sso.columns.organization'),
        cell: ({ row }) =>
            row.original.organization
                ? h(
                      ULink,
                      {
                          to: adminPath(`/organizations/${row.original.organization.id}`),
                          class: 'text-highlighted hover:underline'
                      },
                      () => row.original.organization!.name
                  )
                : h('span', { class: 'text-muted' }, t('admin.sso.noOrganization'))
    },
    {
        id: 'owner',
        header: t('admin.sso.columns.registeredBy'),
        cell: ({ row }) =>
            row.original.owner
                ? h(
                      ULink,
                      {
                          to: adminPath(`/users/${row.original.owner.id}`),
                          class: 'text-highlighted hover:underline'
                      },
                      () => row.original.owner!.name || row.original.owner!.email
                  )
                : h('span', { class: 'text-muted' }, '—')
    }
]);

useSeoMeta({ title: () => t('admin.sso.title') });
</script>

<template>
    <UDashboardPanel id="sso">
        <template #header>
            <UDashboardNavbar :title="t('admin.sso.title')" :badge="data?.length ?? 0">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <p class="text-sm text-muted">{{ t('admin.sso.intro') }}</p>
            <UInput v-model="search" icon="i-lucide-search" :placeholder="t('admin.sso.search')" class="max-w-sm" />
            <UAlert
                v-if="error"
                color="error"
                icon="i-lucide-circle-alert"
                :title="t('admin.sso.loadFailed')"
                :description="error.statusMessage || error.message"
            />
            <UTable
                v-else
                :data="rows"
                :columns="columns"
                :loading="status === 'pending'"
                :empty="t('admin.sso.empty')"
                class="shrink-0"
                :ui="{
                    base: 'table-fixed border-separate border-spacing-0',
                    thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                    tbody: '[&>tr]:last:[&>td]:border-b-0',
                    th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                    td: 'border-b border-default'
                }"
            />
        </template>
    </UDashboardPanel>
</template>
