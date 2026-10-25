<script setup lang="ts">
import { useAuthClient } from '@nuxtjs/better-auth/composables';
import { computed, reactive, ref, useAuthCapabilities, useAuthI18n, useToast } from '#imports';

import { fieldLabel, fieldValues, toFieldInput } from '../../utils/fields';
import type { SsoProvider } from '../../utils/sso';
import FieldInputs from './FieldInputs.vue';

/**
 * An organization's single sign-on (Better Auth's SSO plugin): its OIDC and SAML identity providers, registered,
 * edited and deleted here, with the addresses to give the identity provider and, with domain verification, the DNS
 * record that proves the organization owns each domain. Better Auth lets only the organization's owners and admins do
 * this, so the page shows the tab to them.
 */
const props = defineProps<{ organizationId: string; providers: SsoProvider[] }>();
const emit = defineEmits<{ changed: [] }>();

const { t, errorMessage } = useAuthI18n();
const toast = useToast();
const { capabilities } = useAuthCapabilities();
const sso = computed(() => capabilities.value?.sso);
const fields = computed(() => sso.value?.fields ?? []);

type Result = Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
type SsoClient = {
    register(input: Record<string, unknown>): Result;
    updateProvider(input: Record<string, unknown>): Result;
    deleteProvider(input: { providerId: string }): Result;
    verifyDomain(input: { providerId: string }): Result;
    requestDomainVerification(input: { providerId: string }): Result;
};
/** The call's data (true when it has none), or null when it failed, saying so in a toast. */
async function run(call: (client: SsoClient) => Result, done?: string) {
    const { data, error } = await call((useAuthClient() as unknown as { sso: SsoClient }).sso);
    if (error) {
        toast.add({ title: t('organization.failed'), description: errorMessage(error), color: 'error' });
        return null;
    }
    if (done) toast.add({ title: done, color: 'success' });
    return data ?? true;
}

// The addresses the identity provider needs, from Better Auth's base URL (which includes its path, eg /api/auth).
const baseURL = computed(() => sso.value?.baseURL ?? '');
function redirectUri(providerId: string) {
    const shared = sso.value?.redirectURI;
    if (!shared) return `${baseURL.value}/sso/callback/${providerId}`;
    return /^https?:\/\//.test(shared) ? shared : `${baseURL.value}${shared.startsWith('/') ? '' : '/'}${shared}`;
}
const acsUrl = (providerId: string) => `${baseURL.value}/sso/saml2/sp/acs/${providerId}`;
const domains = (provider: SsoProvider) =>
    provider.domain
        .split(',')
        .map((domain) => domain.trim())
        .filter(Boolean);
const recordName = (provider: SsoProvider, domain: string) =>
    `_${sso.value?.domainVerification.tokenPrefix ?? 'better-auth-token'}-${provider.providerId}.${domain}`;
async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.add({ title: t('organization.sso.copied'), color: 'success' });
}

// Domain verification: the token goes in a TXT record; Better Auth hands back the current one or a new one.
const tokens = ref<Record<string, string>>({});
async function showToken(provider: SsoProvider) {
    const data = await run((client) => client.requestDomainVerification({ providerId: provider.providerId }));
    if (data && typeof data === 'object' && 'domainVerificationToken' in data) {
        tokens.value[provider.providerId] = String(data.domainVerificationToken);
    }
}
async function verify(provider: SsoProvider) {
    if (
        await run(
            (client) => client.verifyDomain({ providerId: provider.providerId }),
            t('organization.sso.verified', { domain: provider.domain })
        )
    ) {
        emit('changed');
    }
}

// Registering or editing a provider. Left empty when editing, secrets, certificates and mappings stay as they are.
type Form = {
    type: 'oidc' | 'saml';
    providerId: string;
    domain: string;
    issuer: string;
    clientId: string;
    clientSecret: string;
    scopes: string;
    discoveryEndpoint: string;
    tokenEndpointAuthentication: string;
    pkce: boolean;
    entryPoint: string;
    metadata: string;
    entityID: string;
    cert: string;
    audience: string;
    wantAssertionsSigned: boolean;
    authnRequestsSigned: boolean;
    signatureAlgorithm: string;
    digestAlgorithm: string;
    identifierFormat: string;
    idpInitiatedCallbackUrl: string;
    mapping: Record<string, string>;
    extra: Record<string, string | boolean>;
};
const blank = (): Form => ({
    type: 'oidc',
    providerId: '',
    domain: '',
    issuer: '',
    clientId: '',
    clientSecret: '',
    scopes: '',
    discoveryEndpoint: '',
    tokenEndpointAuthentication: '',
    pkce: true,
    entryPoint: '',
    metadata: '',
    entityID: '',
    cert: '',
    audience: '',
    wantAssertionsSigned: true,
    authnRequestsSigned: false,
    signatureAlgorithm: '',
    digestAlgorithm: '',
    identifierFormat: '',
    idpInitiatedCallbackUrl: '',
    mapping: {},
    extra: {}
});
const form = reactive<Form>(blank());
const editing = ref<{ provider: SsoProvider | null } | null>(null);
const open = computed({
    get: () => editing.value !== null,
    set: (value) => {
        if (!value) editing.value = null;
    }
});
function start(provider?: SsoProvider) {
    Object.assign(form, blank());
    if (provider) {
        Object.assign(form, {
            type: provider.type,
            providerId: provider.providerId,
            domain: provider.domain,
            issuer: provider.issuer,
            scopes: provider.oidcConfig?.scopes?.join(' ') ?? '',
            discoveryEndpoint: provider.oidcConfig?.discoveryEndpoint ?? '',
            tokenEndpointAuthentication: provider.oidcConfig?.tokenEndpointAuthentication ?? '',
            pkce: provider.oidcConfig?.pkce ?? true,
            entryPoint: provider.samlConfig?.entryPoint ?? '',
            audience: provider.samlConfig?.audience ?? '',
            wantAssertionsSigned: provider.samlConfig?.wantAssertionsSigned ?? true,
            authnRequestsSigned: provider.samlConfig?.authnRequestsSigned ?? false,
            signatureAlgorithm: provider.samlConfig?.signatureAlgorithm ?? '',
            digestAlgorithm: provider.samlConfig?.digestAlgorithm ?? '',
            identifierFormat: provider.samlConfig?.identifierFormat ?? '',
            idpInitiatedCallbackUrl: provider.samlConfig?.idpInitiatedCallbackUrl ?? '',
            extra: Object.fromEntries(
                fields.value.map((field) => [field.name, toFieldInput(field, provider[field.name])])
            )
        });
    }
    editing.value = { provider: provider ?? null };
}

const mappingKeys = computed(() =>
    form.type === 'oidc'
        ? ['email', 'emailVerified', 'name', 'image']
        : ['email', 'emailVerified', 'name', 'firstName', 'lastName']
);
/** Only what was filled in: Better Auth's defaults (or, when editing, what's saved) for the rest. */
const filled = <T extends Record<string, unknown>>(values: T) =>
    Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== '' && value !== undefined && value !== null)
    ) as Partial<T>;
function body() {
    const mapping = filled(Object.fromEntries(mappingKeys.value.map((key) => [key, form.mapping[key]?.trim() ?? ''])));
    const withMapping = Object.keys(mapping).length ? { mapping } : {};
    const scopes = form.scopes.split(/[\s,]+/).filter(Boolean);
    const config =
        form.type === 'oidc'
            ? {
                  oidcConfig: {
                      ...filled({
                          clientId: form.clientId.trim(),
                          clientSecret: form.clientSecret,
                          discoveryEndpoint: form.discoveryEndpoint.trim(),
                          tokenEndpointAuthentication: form.tokenEndpointAuthentication
                      }),
                      ...(scopes.length && { scopes }),
                      pkce: form.pkce,
                      ...withMapping
                  }
              }
            : {
                  samlConfig: {
                      ...filled({
                          entryPoint: form.entryPoint.trim(),
                          cert: form.cert.trim(),
                          audience: form.audience.trim(),
                          signatureAlgorithm: form.signatureAlgorithm.trim(),
                          digestAlgorithm: form.digestAlgorithm.trim(),
                          identifierFormat: form.identifierFormat.trim(),
                          idpInitiatedCallbackUrl: form.idpInitiatedCallbackUrl.trim()
                      }),
                      wantAssertionsSigned: form.wantAssertionsSigned,
                      authnRequestsSigned: form.authnRequestsSigned,
                      // The IdP's metadata XML, or else its entity ID.
                      ...((form.metadata.trim() || form.entityID.trim()) && {
                          idpMetadata: form.metadata.trim()
                              ? { metadata: form.metadata.trim() }
                              : { entityID: form.entityID.trim() }
                      }),
                      ...withMapping
                  }
              };
    return {
        providerId: form.providerId.trim(),
        issuer: form.issuer.trim(),
        domain: form.domain
            .split(',')
            .map((domain) => domain.trim().toLowerCase())
            .filter(Boolean)
            .join(','),
        ...config,
        ...fieldValues(fields.value, form.extra)
    };
}
const saving = ref(false);
async function save() {
    saving.value = true;
    const existing = editing.value?.provider;
    // Unchanged domains stay as typed (a changed domain needs verifying again).
    const update = () => {
        const { domain, issuer, ...rest } = body();
        return {
            ...rest,
            ...(form.domain.trim() !== existing?.domain && { domain }),
            ...(issuer !== existing?.issuer && { issuer })
        };
    };
    const data = await run(
        (client) =>
            existing
                ? client.updateProvider(update())
                : client.register({ ...body(), organizationId: props.organizationId }),
        existing ? t('organization.sso.updated') : t('organization.sso.registered', { name: form.providerId.trim() })
    );
    saving.value = false;
    if (!data) return;
    if (typeof data === 'object' && 'domainVerificationToken' in data && data.domainVerificationToken) {
        tokens.value[form.providerId.trim()] = String(data.domainVerificationToken);
    }
    editing.value = null;
    emit('changed');
}

const deleting = ref<SsoProvider | null>(null);
async function remove() {
    const provider = deleting.value;
    if (!provider) return;
    if (
        await run(
            (client) => client.deleteProvider({ providerId: provider.providerId }),
            t('organization.sso.deleted', { name: provider.providerId })
        )
    ) {
        deleting.value = null;
        emit('changed');
    }
}

// The select can't hold an empty value: `discovered` stands for leaving it to the provider.
const authMethod = computed({
    get: () => form.tokenEndpointAuthentication || 'discovered',
    set: (value: string) => {
        form.tokenEndpointAuthentication = value === 'discovered' ? '' : value;
    }
});
const authMethods = computed(() => [
    { label: t('organization.sso.form.discovered'), value: 'discovered' },
    { label: 'client_secret_basic', value: 'client_secret_basic' },
    { label: 'client_secret_post', value: 'client_secret_post' }
]);
</script>

<template>
    <div class="space-y-6">
        <UPageCard
            :title="t('organization.sso.title')"
            :description="t('organization.sso.description')"
            variant="subtle"
        >
            <p v-if="!providers.length" class="text-sm text-muted">{{ t('organization.sso.none') }}</p>
            <template #footer>
                <UButton :label="t('organization.sso.register')" icon="i-lucide-plus" @click="start()" />
            </template>
        </UPageCard>

        <UPageCard v-for="provider in providers" :key="provider.providerId" variant="subtle">
            <template #title>
                <span class="flex flex-wrap items-center gap-2">
                    {{ provider.providerId }}
                    <UBadge
                        :label="provider.type === 'saml' ? 'SAML' : 'OIDC'"
                        color="neutral"
                        variant="subtle"
                        size="sm"
                    />
                    <template v-if="sso?.domainVerification.enabled">
                        <UBadge
                            v-if="provider.domainVerified"
                            :label="t('organization.sso.domainVerified')"
                            color="success"
                            variant="subtle"
                            size="sm"
                        />
                        <UBadge
                            v-else
                            :label="t('organization.sso.domainUnverified')"
                            color="warning"
                            variant="subtle"
                            size="sm"
                        />
                    </template>
                </span>
            </template>
            <template #description>{{ provider.domain }}</template>

            <dl class="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                <dt class="text-muted">{{ t('organization.sso.issuer') }}</dt>
                <dd class="min-w-0 break-all">{{ provider.issuer }}</dd>
                <template v-if="provider.type === 'oidc'">
                    <dt class="text-muted">{{ t('organization.sso.redirectUri') }}</dt>
                    <dd class="flex min-w-0 items-center gap-1">
                        <code class="break-all text-xs">{{ redirectUri(provider.providerId) }}</code>
                        <UButton
                            icon="i-lucide-copy"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            :aria-label="t('organization.sso.copy')"
                            @click="copy(redirectUri(provider.providerId))"
                        />
                    </dd>
                    <template v-if="provider.oidcConfig?.clientIdLastFour">
                        <dt class="text-muted">{{ t('organization.sso.form.clientId') }}</dt>
                        <dd>{{ provider.oidcConfig.clientIdLastFour }}</dd>
                    </template>
                </template>
                <template v-else>
                    <dt class="text-muted">{{ t('organization.sso.acsUrl') }}</dt>
                    <dd class="flex min-w-0 items-center gap-1">
                        <code class="break-all text-xs">{{ acsUrl(provider.providerId) }}</code>
                        <UButton
                            icon="i-lucide-copy"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            :aria-label="t('organization.sso.copy')"
                            @click="copy(acsUrl(provider.providerId))"
                        />
                    </dd>
                    <dt class="text-muted">{{ t('organization.sso.spMetadata') }}</dt>
                    <dd class="min-w-0">
                        <ULink :to="provider.spMetadataUrl" target="_blank" external class="text-primary break-all">
                            {{ t('organization.sso.spMetadataLink') }}
                        </ULink>
                    </dd>
                </template>
                <template v-for="field in fields" :key="field.name">
                    <template v-if="provider[field.name] !== undefined && provider[field.name] !== null">
                        <dt class="text-muted">{{ fieldLabel(field.name) }}</dt>
                        <dd class="min-w-0 break-all">{{ toFieldInput(field, provider[field.name]) }}</dd>
                    </template>
                </template>
            </dl>

            <!-- Proving the organization owns its domains: a TXT record on each. -->
            <UAlert
                v-if="sso?.domainVerification.enabled && !provider.domainVerified"
                color="warning"
                variant="subtle"
                icon="i-lucide-globe-lock"
                :title="t('organization.sso.verifyTitle')"
                :description="t('organization.sso.verifyDescription')"
            >
                <template #actions>
                    <div class="w-full space-y-3">
                        <dl class="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
                            <template v-for="domain in domains(provider)" :key="domain">
                                <dt class="text-muted">{{ t('organization.sso.recordName') }}</dt>
                                <dd class="min-w-0">
                                    <code class="break-all">{{ recordName(provider, domain) }}</code>
                                </dd>
                            </template>
                            <dt class="text-muted">{{ t('organization.sso.recordValue') }}</dt>
                            <dd class="flex min-w-0 items-center gap-1">
                                <template v-if="tokens[provider.providerId]">
                                    <code class="break-all">{{ tokens[provider.providerId] }}</code>
                                    <UButton
                                        icon="i-lucide-copy"
                                        color="neutral"
                                        variant="ghost"
                                        size="xs"
                                        :aria-label="t('organization.sso.copy')"
                                        @click="copy(tokens[provider.providerId]!)"
                                    />
                                </template>
                                <UButton
                                    v-else
                                    :label="t('organization.sso.showToken')"
                                    color="neutral"
                                    variant="link"
                                    size="xs"
                                    class="px-0"
                                    loading-auto
                                    @click="showToken(provider)"
                                />
                            </dd>
                        </dl>
                        <UButton
                            :label="t('organization.sso.verify')"
                            icon="i-lucide-badge-check"
                            size="sm"
                            loading-auto
                            @click="verify(provider)"
                        />
                    </div>
                </template>
            </UAlert>

            <div class="flex flex-wrap justify-end gap-2">
                <UButton
                    :label="t('organization.sso.edit')"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    @click="start(provider)"
                />
                <UButton
                    :label="t('organization.sso.delete')"
                    color="error"
                    variant="ghost"
                    size="sm"
                    @click="deleting = provider"
                />
            </div>
        </UPageCard>

        <UModal
            v-model:open="open"
            :title="editing?.provider ? t('organization.sso.editTitle') : t('organization.sso.registerTitle')"
            :description="editing?.provider ? t('organization.sso.editHint') : t('organization.sso.registerHint')"
            :ui="{ content: 'max-w-2xl' }"
        >
            <template #body>
                <form id="organization-sso-form" class="space-y-4" @submit.prevent="save">
                    <UFormField v-if="!editing?.provider" :label="t('organization.sso.form.type')">
                        <URadioGroup
                            v-model="form.type"
                            orientation="horizontal"
                            :items="[
                                { label: 'OIDC', value: 'oidc' },
                                { label: 'SAML 2.0', value: 'saml' }
                            ]"
                        />
                    </UFormField>
                    <UFormField
                        :label="t('organization.sso.form.providerId')"
                        :help="t('organization.sso.form.providerIdHelp')"
                        required
                    >
                        <UInput
                            v-model="form.providerId"
                            required
                            :disabled="!!editing?.provider"
                            pattern="[A-Za-z0-9_\-]+"
                            class="w-full"
                        />
                    </UFormField>
                    <UFormField
                        :label="t('organization.sso.form.domain')"
                        :help="t('organization.sso.form.domainHelp')"
                        required
                    >
                        <UInput v-model="form.domain" required placeholder="example.com" class="w-full" />
                    </UFormField>
                    <UFormField
                        :label="t('organization.sso.form.issuer')"
                        :help="
                            form.type === 'oidc'
                                ? t('organization.sso.form.issuerOidcHelp')
                                : t('organization.sso.form.issuerSamlHelp')
                        "
                        required
                    >
                        <UInput v-model="form.issuer" type="url" required class="w-full" />
                    </UFormField>

                    <template v-if="form.type === 'oidc'">
                        <UFormField :label="t('organization.sso.form.clientId')" :required="!editing?.provider">
                            <UInput
                                v-model="form.clientId"
                                :required="!editing?.provider"
                                :placeholder="editing?.provider?.oidcConfig?.clientIdLastFour"
                                class="w-full"
                            />
                        </UFormField>
                        <UFormField :label="t('organization.sso.form.clientSecret')" :required="!editing?.provider">
                            <UInput
                                v-model="form.clientSecret"
                                type="password"
                                autocomplete="off"
                                :required="!editing?.provider"
                                class="w-full"
                            />
                        </UFormField>
                    </template>
                    <template v-else>
                        <UFormField
                            :label="t('organization.sso.form.entryPoint')"
                            :help="t('organization.sso.form.entryPointHelp')"
                            :required="!editing?.provider"
                        >
                            <UInput
                                v-model="form.entryPoint"
                                type="url"
                                :required="!editing?.provider"
                                class="w-full"
                            />
                        </UFormField>
                        <UFormField
                            :label="t('organization.sso.form.metadata')"
                            :help="t('organization.sso.form.metadataHelp')"
                        >
                            <UTextarea v-model="form.metadata" :rows="4" class="w-full font-mono text-xs" />
                        </UFormField>
                        <UFormField
                            v-if="!form.metadata.trim()"
                            :label="t('organization.sso.form.entityID')"
                            :required="!editing?.provider"
                        >
                            <UInput v-model="form.entityID" :required="!editing?.provider" class="w-full" />
                        </UFormField>
                        <UFormField
                            :label="t('organization.sso.form.cert')"
                            :help="t('organization.sso.form.certHelp')"
                        >
                            <UTextarea
                                v-model="form.cert"
                                :rows="3"
                                placeholder="-----BEGIN CERTIFICATE-----"
                                class="w-full font-mono text-xs"
                            />
                        </UFormField>
                    </template>

                    <FieldInputs v-model="form.extra" :fields="fields" />

                    <UCollapsible :unmount-on-hide="false">
                        <UButton
                            :label="t('organization.sso.form.advanced')"
                            color="neutral"
                            variant="link"
                            trailing-icon="i-lucide-chevron-down"
                            class="px-0"
                        />
                        <template #content>
                            <div class="space-y-4 pt-3">
                                <template v-if="form.type === 'oidc'">
                                    <UFormField
                                        :label="t('organization.sso.form.scopes')"
                                        :help="t('organization.sso.form.scopesHelp')"
                                    >
                                        <UInput
                                            v-model="form.scopes"
                                            placeholder="openid email profile"
                                            class="w-full"
                                        />
                                    </UFormField>
                                    <UFormField
                                        :label="t('organization.sso.form.discoveryEndpoint')"
                                        :help="t('organization.sso.form.discoveryEndpointHelp')"
                                    >
                                        <UInput v-model="form.discoveryEndpoint" type="url" class="w-full" />
                                    </UFormField>
                                    <UFormField :label="t('organization.sso.form.tokenAuth')">
                                        <USelect v-model="authMethod" :items="authMethods" class="w-full" />
                                    </UFormField>
                                    <USwitch v-model="form.pkce" :label="t('organization.sso.form.pkce')" />
                                </template>
                                <template v-else>
                                    <UFormField
                                        :label="t('organization.sso.form.audience')"
                                        :help="t('organization.sso.form.audienceHelp')"
                                    >
                                        <UInput v-model="form.audience" class="w-full" />
                                    </UFormField>
                                    <UFormField :label="t('organization.sso.form.identifierFormat')">
                                        <UInput
                                            v-model="form.identifierFormat"
                                            placeholder="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
                                            class="w-full"
                                        />
                                    </UFormField>
                                    <div class="grid gap-4 sm:grid-cols-2">
                                        <UFormField :label="t('organization.sso.form.signatureAlgorithm')">
                                            <UInput
                                                v-model="form.signatureAlgorithm"
                                                placeholder="sha256"
                                                class="w-full"
                                            />
                                        </UFormField>
                                        <UFormField :label="t('organization.sso.form.digestAlgorithm')">
                                            <UInput
                                                v-model="form.digestAlgorithm"
                                                placeholder="sha256"
                                                class="w-full"
                                            />
                                        </UFormField>
                                    </div>
                                    <UFormField
                                        :label="t('organization.sso.form.idpInitiatedCallbackUrl')"
                                        :help="t('organization.sso.form.idpInitiatedCallbackUrlHelp')"
                                    >
                                        <UInput v-model="form.idpInitiatedCallbackUrl" class="w-full" />
                                    </UFormField>
                                    <USwitch
                                        v-model="form.wantAssertionsSigned"
                                        :label="t('organization.sso.form.wantAssertionsSigned')"
                                    />
                                    <USwitch
                                        v-model="form.authnRequestsSigned"
                                        :label="t('organization.sso.form.authnRequestsSigned')"
                                    />
                                </template>
                                <p class="text-sm font-medium text-highlighted">
                                    {{ t('organization.sso.form.mapping') }}
                                </p>
                                <p class="text-xs text-muted">{{ t('organization.sso.form.mappingHelp') }}</p>
                                <div class="grid gap-4 sm:grid-cols-2">
                                    <UFormField v-for="key in mappingKeys" :key="key" :label="fieldLabel(key)">
                                        <UInput v-model="form.mapping[key]" class="w-full" />
                                    </UFormField>
                                </div>
                            </div>
                        </template>
                    </UCollapsible>
                </form>
            </template>
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton :label="t('common.cancel')" color="neutral" variant="subtle" @click="editing = null" />
                    <UButton
                        type="submit"
                        form="organization-sso-form"
                        :label="editing?.provider ? t('common.save') : t('organization.sso.register')"
                        :loading="saving"
                    />
                </div>
            </template>
        </UModal>

        <UModal
            :open="!!deleting"
            :title="t('organization.sso.deleteConfirm', { name: deleting?.providerId ?? '' })"
            :description="t('organization.sso.deleteDescription')"
            @update:open="(value) => !value && (deleting = null)"
        >
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton :label="t('common.cancel')" color="neutral" variant="subtle" @click="deleting = null" />
                    <UButton :label="t('organization.sso.delete')" color="error" loading-auto @click="remove" />
                </div>
            </template>
        </UModal>
    </div>
</template>
