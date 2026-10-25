<script setup lang="ts">
import { defaultStatements } from 'better-auth/plugins/admin/access';
import { upperFirst } from 'scule';
import { roles as accessRoles } from '#better-auth-ui/roles';
import {
    computed,
    useAuthCapabilities,
    useAuthI18n,
    useBetterAuthAdminConfig,
    useRuntimeConfig,
    useSeoMeta
} from '#imports';

import type { TwoFactorRequired } from '../../two-factor-required';
import { EMAIL_NAMES } from '../../server/emails/types';
import CardTitle from '../components/account/CardTitle.vue';
import type { MessageKey } from '../i18n';
import { providerInfo } from '../utils/providers';

/**
 * What the app's set-up allows, read from its Better Auth config and `betterAuthUi` options: how people sign in,
 * security, account self-service, emails, the admin's own records, and what each role can do. Read-only.
 */
const { t } = useAuthI18n();
useSeoMeta({ title: () => t('admin.configuration.title') });

const { capabilities } = useAuthCapabilities();
const config = useBetterAuthAdminConfig();
const { twoFactorRequired, captcha, securityAlerts } = useRuntimeConfig().public.betterAuthUi as {
    twoFactorRequired: TwoFactorRequired;
    captcha: { provider: keyof typeof CAPTCHA_NAMES; siteKey: string } | false;
    securityAlerts: Record<'newSignIn' | 'passwordChanged' | 'twoFactor' | 'passkeyAdded', boolean> | false;
};
const CAPTCHA_NAMES = {
    'cloudflare-turnstile': 'Cloudflare Turnstile',
    hcaptcha: 'hCaptcha',
    'google-recaptcha': 'Google reCAPTCHA'
};

type Color = 'success' | 'warning' | 'neutral' | 'primary';
type Row = {
    label: string;
    value: string;
    color?: Color;
    hint?: string;
    icons?: Array<{ name: string; label: string }>;
};
const on = (
    value: boolean,
    yes = t('admin.configuration.on'),
    no = t('admin.configuration.off')
): Pick<Row, 'value' | 'color'> => ({
    value: value ? yes : no,
    color: value ? 'success' : 'neutral'
});

const sections = computed<Array<{ title: string; icon: string; rows: Row[] }>>(() => {
    const c = capabilities.value;
    if (!c) return [];
    const minutes = Math.round(config.activityInterval / 60_000);
    return [
        {
            title: t('admin.configuration.sections.signIn'),
            icon: 'i-lucide-log-in',
            rows: [
                { label: t('admin.configuration.rows.emailAndPassword'), ...on(c.emailAndPassword) },
                {
                    label: t('admin.configuration.rows.signUps'),
                    ...on(c.signUp, t('admin.configuration.rows.open'), t('admin.configuration.rows.closed'))
                },
                {
                    label: t('admin.configuration.rows.emailVerification'),
                    ...(c.requireEmailVerification
                        ? { value: t('admin.configuration.rows.requiredToSignIn'), color: 'primary' as const }
                        : on(c.emailVerification, t('admin.configuration.rows.sentNotRequired')))
                },
                {
                    label: t('admin.configuration.rows.passwords'),
                    value: t('admin.configuration.rows.characters', {
                        min: c.minPasswordLength,
                        max: c.maxPasswordLength
                    }),
                    hint: c.resetPassword
                        ? t('admin.configuration.rows.canReset')
                        : t('admin.configuration.rows.cantReset')
                },
                {
                    label: t('admin.configuration.rows.socialProviders'),
                    value: c.socialProviders.length ? '' : t('admin.configuration.rows.none'),
                    color: 'neutral',
                    icons: c.socialProviders.map((id) => ({
                        name: providerInfo(id).icon,
                        label: providerInfo(id).label
                    }))
                },
                { label: t('admin.configuration.rows.passkeys'), ...on(c.passkey) },
                { label: t('admin.configuration.rows.magicLinks'), ...on(c.magicLink) },
                {
                    label: t('admin.configuration.rows.usernames'),
                    ...(c.username
                        ? on(
                              true,
                              t('admin.configuration.rows.characters', {
                                  min: c.username.minLength,
                                  max: c.username.maxLength
                              })
                          )
                        : on(false)),
                    hint: c.username?.immutable ? t('admin.configuration.rows.usernameImmutable') : undefined
                },
                {
                    label: t('admin.configuration.rows.lastUsed'),
                    ...on(c.lastLoginMethod),
                    hint: c.lastLoginMethod ? t('admin.configuration.rows.lastUsedHint') : undefined
                }
            ]
        },
        {
            title: t('admin.configuration.sections.security'),
            icon: 'i-lucide-shield-check',
            rows: [
                {
                    label: t('admin.configuration.rows.twoFactor'),
                    ...(c.twoFactor
                        ? {
                              value: c.twoFactor.otp
                                  ? t('admin.configuration.rows.authenticatorOrEmail')
                                  : t('admin.configuration.rows.authenticator'),
                              color: 'success' as const
                          }
                        : on(false))
                },
                ...(c.twoFactor
                    ? [
                          {
                              label: t('admin.configuration.rows.requiredFor'),
                              value:
                                  twoFactorRequired === true
                                      ? t('admin.configuration.rows.everyone')
                                      : Array.isArray(twoFactorRequired) && twoFactorRequired.length
                                        ? twoFactorRequired.map(upperFirst).join(', ')
                                        : t('admin.configuration.rows.nobody'),
                              color: (twoFactorRequired ? 'primary' : 'neutral') as Color,
                              hint: twoFactorRequired ? t('admin.configuration.rows.requiredHint') : undefined
                          },
                          {
                              label: t('admin.configuration.rows.withoutPassword'),
                              ...on(
                                  c.twoFactor.allowPasswordless,
                                  t('admin.configuration.rows.canTurnOn'),
                                  t('admin.configuration.rows.cantTurnOn')
                              )
                          }
                      ]
                    : []),
                {
                    label: t('admin.configuration.rows.breachedPasswords'),
                    ...on(
                        c.haveIBeenPwned,
                        t('admin.configuration.rows.refused'),
                        t('admin.configuration.rows.allowed')
                    )
                },
                {
                    label: t('admin.configuration.rows.securityAlerts'),
                    ...(securityAlerts
                        ? on(
                              true,
                              (['newSignIn', 'passwordChanged', 'twoFactor', 'passkeyAdded'] as const)
                                  .filter((alert) => securityAlerts[alert])
                                  .map((alert) => t(`admin.configuration.rows.alerts.${alert}`))
                                  .join(', ')
                          )
                        : on(false)),
                    hint: securityAlerts ? t('admin.configuration.rows.securityAlertsHint') : undefined
                },
                {
                    label: t('admin.configuration.rows.captcha'),
                    ...(captcha ? on(true, CAPTCHA_NAMES[captcha.provider]) : on(false)),
                    hint: captcha ? t('admin.configuration.rows.onSignUp') : undefined
                },
                {
                    label: t('admin.configuration.rows.impersonation'),
                    ...on(config.impersonation, t('admin.configuration.rows.impersonationOn')),
                    hint: config.impersonation ? undefined : 'betterAuthUi.admin.impersonation'
                }
            ]
        },
        {
            title: t('admin.configuration.sections.selfService'),
            icon: 'i-lucide-user-round-cog',
            rows: [
                {
                    label: t('admin.configuration.rows.changingEmail'),
                    ...(c.changeEmail
                        ? on(
                              true,
                              c.changeEmailConfirmation
                                  ? t('admin.configuration.rows.changeEmailApproved')
                                  : t('admin.configuration.on')
                          )
                        : on(false))
                },
                {
                    label: t('admin.configuration.rows.deletingAccount'),
                    ...(c.deleteUser
                        ? on(
                              true,
                              c.deleteUserByEmail
                                  ? t('admin.configuration.rows.deleteByEmail')
                                  : t('admin.configuration.on')
                          )
                        : on(false))
                }
            ]
        },
        {
            title: t('admin.configuration.sections.emails'),
            icon: 'i-lucide-mail',
            rows: [
                {
                    label: t('admin.configuration.rows.delivery'),
                    ...(config.emails.send
                        ? on(true, t('admin.configuration.rows.yourSender'))
                        : {
                              value: t('admin.configuration.rows.notSetUp'),
                              color: 'warning' as const,
                              hint: 'betterAuthUi.emails.send'
                          })
                },
                ...EMAIL_NAMES.map((name) => ({
                    label: t(EMAIL_LABELS[name]),
                    hint: name,
                    value: config.emails.templates.includes(name)
                        ? t('admin.configuration.rows.yourTemplate')
                        : t('admin.configuration.rows.plainDefault'),
                    color: (config.emails.templates.includes(name) ? 'primary' : 'neutral') as Color
                }))
            ]
        },
        {
            title: t('admin.configuration.sections.records'),
            icon: 'i-lucide-history',
            rows: [
                {
                    label: t('admin.configuration.rows.auditLog'),
                    ...on(
                        config.auditLog,
                        config.auditLogRetentionDays
                            ? t('admin.configuration.rows.keptDays', { days: config.auditLogRetentionDays })
                            : t('admin.configuration.rows.keptForever')
                    )
                },
                { label: t('admin.configuration.rows.signInsInLog'), ...on(config.lastSignIn) },
                {
                    label: t('admin.configuration.rows.activityTracking'),
                    ...on(
                        config.activityTracking,
                        t(
                            minutes === 1
                                ? 'admin.configuration.rows.every.one'
                                : 'admin.configuration.rows.every.other',
                            {
                                count: minutes
                            }
                        )
                    ),
                    hint: config.activityTracking ? t('admin.configuration.rows.activityHint') : undefined
                },
                { label: t('admin.configuration.rows.adminPages'), value: config.route, color: 'neutral' }
            ]
        }
    ];
});

// The emails in words; the template name (for betterAuthUi.emails.templates) shows under each.
const EMAIL_LABELS: Record<(typeof EMAIL_NAMES)[number], MessageKey> = {
    'verify-email': 'admin.configuration.emails.verifyEmail',
    'reset-password': 'admin.configuration.emails.resetPassword',
    'existing-user-sign-up': 'admin.configuration.emails.existingUserSignUp',
    'change-email-confirmation': 'admin.configuration.emails.changeEmailConfirmation',
    'delete-account': 'admin.configuration.emails.deleteAccount',
    'two-factor-code': 'admin.configuration.emails.twoFactorCode',
    'magic-link': 'admin.configuration.emails.magicLink',
    'new-sign-in': 'admin.configuration.emails.newSignIn',
    'password-changed': 'admin.configuration.emails.passwordChanged',
    'two-factor-changed': 'admin.configuration.emails.twoFactorChanged',
    'passkey-added': 'admin.configuration.emails.passkeyAdded'
};

// Who can do what: Better Auth's Admin permissions, checked against each role exactly as the server checks them.
const PERMISSIONS: Record<string, Record<string, MessageKey>> = {
    user: {
        list: 'admin.configuration.permissions.user.list',
        get: 'admin.configuration.permissions.user.get',
        create: 'admin.configuration.permissions.user.create',
        update: 'admin.configuration.permissions.user.update',
        'set-email': 'admin.configuration.permissions.user.setEmail',
        'set-password': 'admin.configuration.permissions.user.setPassword',
        'set-role': 'admin.configuration.permissions.user.setRole',
        ban: 'admin.configuration.permissions.user.ban',
        impersonate: 'admin.configuration.permissions.user.impersonate',
        'impersonate-admins': 'admin.configuration.permissions.user.impersonateAdmins',
        delete: 'admin.configuration.permissions.user.delete'
    },
    session: {
        list: 'admin.configuration.permissions.session.list',
        revoke: 'admin.configuration.permissions.session.revoke',
        delete: 'admin.configuration.permissions.session.delete'
    }
};
const permissions = computed(() =>
    (Object.keys(defaultStatements) as Array<keyof typeof defaultStatements>).flatMap((resource) =>
        defaultStatements[resource].map((action) => {
            const key = PERMISSIONS[resource]?.[action];
            return { resource, action, label: key ? t(key) : `${resource}: ${action}` };
        })
    )
);
const allows = (role: string, resource: string, action: string) =>
    accessRoles[role]?.authorize({ [resource]: [action] }).success === true;
</script>

<template>
    <UDashboardPanel id="better-auth-ui-configuration">
        <template #header>
            <UDashboardNavbar :title="t('admin.configuration.title')">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <div class="flex flex-col gap-4 sm:gap-6 w-full lg:max-w-4xl mx-auto">
                <p class="text-sm text-muted">
                    {{
                        t('admin.configuration.introBefore', {
                            app: capabilities?.appName ?? t('admin.configuration.theApp')
                        })
                    }}
                    <code class="text-highlighted">betterAuthUi</code>
                    {{ t('admin.configuration.introAfter') }}
                </p>

                <div class="grid items-start gap-4 sm:gap-6 lg:grid-cols-2">
                    <UPageCard v-for="section in sections" :key="section.title" variant="subtle">
                        <template #title><CardTitle :icon="section.icon" :title="section.title" /></template>
                        <dl class="divide-y divide-default text-sm">
                            <div
                                v-for="row in section.rows"
                                :key="row.label"
                                class="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                            >
                                <dt class="text-muted shrink-0 max-w-1/2">{{ row.label }}</dt>
                                <!-- Long values (in any language) wrap inside the card. -->
                                <dd class="text-end min-w-0">
                                    <span class="inline-flex flex-wrap justify-end items-center gap-1.5">
                                        <UBadge
                                            v-if="row.value"
                                            :label="row.value"
                                            :color="row.color ?? 'neutral'"
                                            variant="subtle"
                                            :ui="{ label: 'whitespace-normal text-end' }"
                                            class="max-w-full h-auto"
                                        />
                                        <UTooltip v-for="icon in row.icons" :key="icon.label" :text="icon.label">
                                            <UIcon :name="icon.name" :aria-label="icon.label" class="size-5" />
                                        </UTooltip>
                                    </span>
                                    <span v-if="row.hint" class="block text-xs text-dimmed mt-1">{{ row.hint }}</span>
                                </dd>
                            </div>
                        </dl>
                    </UPageCard>
                </div>

                <UPageCard variant="subtle">
                    <template #title
                        ><CardTitle icon="i-lucide-key-square" :title="t('admin.configuration.roles.title')"
                    /></template>
                    <template #description>
                        {{ t('admin.configuration.roles.descriptionBefore') }}
                        <UBadge :label="t('admin.configuration.roles.staff')" size="sm" variant="subtle" />
                        {{ t('admin.configuration.roles.descriptionAfter') }}
                    </template>
                    <div class="overflow-x-auto -mx-1">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-left">
                                    <th class="py-2 px-1 font-medium text-muted">
                                        {{ t('admin.configuration.roles.permission') }}
                                    </th>
                                    <th
                                        v-for="role in config.roles"
                                        :key="role"
                                        class="py-2 px-3 font-medium text-highlighted text-center whitespace-nowrap"
                                    >
                                        {{ upperFirst(role) }}
                                        <UBadge
                                            v-if="config.staffRoles.includes(role)"
                                            :label="t('admin.configuration.roles.staff')"
                                            size="sm"
                                            variant="subtle"
                                            class="ms-1"
                                        />
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-default">
                                <tr
                                    v-for="permission in permissions"
                                    :key="`${permission.resource}:${permission.action}`"
                                >
                                    <td class="py-2 px-1">
                                        {{ permission.label }}
                                        <span class="ms-1 font-mono text-xs text-dimmed"
                                            >{{ permission.resource }}:{{ permission.action }}</span
                                        >
                                    </td>
                                    <td v-for="role in config.roles" :key="role" class="py-2 px-3 text-center">
                                        <UIcon
                                            v-if="allows(role, permission.resource, permission.action)"
                                            name="i-lucide-check"
                                            class="size-4 text-success"
                                            :aria-label="t('admin.configuration.roles.allowed')"
                                        />
                                        <UIcon
                                            v-else
                                            name="i-lucide-minus"
                                            class="size-4 text-dimmed"
                                            :aria-label="t('admin.configuration.roles.notAllowed')"
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </UPageCard>
            </div>
        </template>
    </UDashboardPanel>
</template>
