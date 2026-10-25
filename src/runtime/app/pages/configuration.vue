<script setup lang="ts">
import { defaultStatements } from 'better-auth/plugins/admin/access';
import { upperFirst } from 'scule';
import { roles as accessRoles } from '#better-auth-ui/roles';
import { computed, useAuthCapabilities, useBetterAuthAdminConfig, useRuntimeConfig, useSeoMeta } from '#imports';

import type { TwoFactorRequired } from '../../two-factor-required';
import { EMAIL_NAMES } from '../../server/emails/types';
import CardTitle from '../components/account/CardTitle.vue';
import { providerInfo } from '../utils/providers';

/**
 * What the app's set-up allows, read from its Better Auth config and `betterAuthUi` options: how people sign in,
 * security, account self-service, emails, the admin's own records, and what each role can do. Read-only.
 */
useSeoMeta({ title: 'Configuration' });

const { capabilities } = useAuthCapabilities();
const config = useBetterAuthAdminConfig();
const { twoFactorRequired } = useRuntimeConfig().public.betterAuthUi as { twoFactorRequired: TwoFactorRequired };

type Color = 'success' | 'warning' | 'neutral' | 'primary';
type Row = {
    label: string;
    value: string;
    color?: Color;
    hint?: string;
    icons?: Array<{ name: string; label: string }>;
};
const on = (value: boolean, yes = 'On', no = 'Off'): Pick<Row, 'value' | 'color'> => ({
    value: value ? yes : no,
    color: value ? 'success' : 'neutral'
});

const sections = computed<Array<{ title: string; icon: string; rows: Row[] }>>(() => {
    const c = capabilities.value;
    if (!c) return [];
    const minutes = Math.round(config.activityInterval / 60_000);
    return [
        {
            title: 'Signing in',
            icon: 'i-lucide-log-in',
            rows: [
                { label: 'Email and password', ...on(c.emailAndPassword) },
                { label: 'Sign-ups', ...on(c.signUp, 'Open', 'Closed') },
                {
                    label: 'Email verification',
                    ...(c.requireEmailVerification
                        ? { value: 'Required to sign in', color: 'primary' as const }
                        : on(c.emailVerification, 'Sent, not required', 'Off'))
                },
                {
                    label: 'Passwords',
                    value: `${c.minPasswordLength}–${c.maxPasswordLength} characters`,
                    hint: c.resetPassword ? 'Can be reset by email' : "Can't be reset by email"
                },
                {
                    label: 'Social providers',
                    value: c.socialProviders.length ? '' : 'None',
                    color: 'neutral',
                    icons: c.socialProviders.map((id) => ({
                        name: providerInfo(id).icon,
                        label: providerInfo(id).label
                    }))
                },
                { label: 'Passkeys', ...on(c.passkey) }
            ]
        },
        {
            title: 'Security',
            icon: 'i-lucide-shield-check',
            rows: [
                {
                    label: 'Two-factor',
                    ...(c.twoFactor
                        ? {
                              value: c.twoFactor.otp ? 'Authenticator app or email codes' : 'Authenticator app',
                              color: 'success' as const
                          }
                        : on(false))
                },
                ...(c.twoFactor
                    ? [
                          {
                              label: 'Required for',
                              value:
                                  twoFactorRequired === true
                                      ? 'Everyone'
                                      : Array.isArray(twoFactorRequired) && twoFactorRequired.length
                                        ? twoFactorRequired.map(upperFirst).join(', ')
                                        : 'Nobody (optional)',
                              color: (twoFactorRequired ? 'primary' : 'neutral') as Color,
                              hint: twoFactorRequired
                                  ? 'Passkey sign-ins count; password sign-ins need a code'
                                  : undefined
                          },
                          {
                              label: 'Without a password',
                              ...on(c.twoFactor.allowPasswordless, 'Can turn it on', "Can't turn it on")
                          }
                      ]
                    : []),
                {
                    label: 'Impersonation',
                    ...on(config.impersonation, 'Admins can sign in as users'),
                    hint: config.impersonation ? undefined : 'betterAuthUi.admin.impersonation'
                }
            ]
        },
        {
            title: 'Self-service',
            icon: 'i-lucide-user-round-cog',
            rows: [
                {
                    label: 'Changing email',
                    ...(c.changeEmail
                        ? on(true, c.changeEmailConfirmation ? 'On, approved from the current address' : 'On')
                        : on(false))
                },
                {
                    label: 'Deleting their account',
                    ...(c.deleteUser ? on(true, c.deleteUserByEmail ? 'On, confirmed by email' : 'On') : on(false))
                }
            ]
        },
        {
            title: 'Emails',
            icon: 'i-lucide-mail',
            rows: [
                {
                    label: 'Delivery',
                    ...(config.emails.send
                        ? on(true, 'Your sender')
                        : { value: 'Not set up', color: 'warning' as const, hint: 'betterAuthUi.emails.send' })
                },
                ...EMAIL_NAMES.map((name) => ({
                    label: EMAIL_LABELS[name],
                    hint: name,
                    value: config.emails.templates.includes(name) ? 'Your template' : 'Plain-text default',
                    color: (config.emails.templates.includes(name) ? 'primary' : 'neutral') as Color
                }))
            ]
        },
        {
            title: 'Admin records',
            icon: 'i-lucide-history',
            rows: [
                {
                    label: 'Audit log',
                    ...on(
                        config.auditLog,
                        config.auditLogRetentionDays ? `Kept ${config.auditLogRetentionDays} days` : 'Kept forever'
                    )
                },
                { label: "Users' sign-ins in the log", ...on(config.lastSignIn) },
                {
                    label: 'Activity tracking',
                    ...on(config.activityTracking, `Every ${minutes} minute${minutes === 1 ? '' : 's'}`),
                    hint: config.activityTracking ? '"Last active" and "online now"' : undefined
                },
                { label: 'Admin pages', value: config.route, color: 'neutral' }
            ]
        }
    ];
});

// The emails in words; the template name (for betterAuthUi.emails.templates) shows under each.
const EMAIL_LABELS: Record<(typeof EMAIL_NAMES)[number], string> = {
    'verify-email': 'Verify email',
    'reset-password': 'Reset password',
    'existing-user-sign-up': 'Sign-up with a taken email',
    'change-email-confirmation': 'Approve an email change',
    'delete-account': 'Confirm deleting an account',
    'two-factor-code': 'Two-factor code'
};

// Who can do what: Better Auth's Admin permissions, checked against each role exactly as the server checks them.
const PERMISSIONS: Record<string, Record<string, string>> = {
    user: {
        list: 'See the user list',
        get: 'View a user',
        create: 'Create users',
        update: 'Edit names and details',
        'set-email': 'Change emails',
        'set-password': 'Set passwords',
        'set-role': 'Change roles',
        ban: 'Ban and unban',
        impersonate: 'Sign in as a user',
        'impersonate-admins': 'Sign in as an admin',
        delete: 'Delete users'
    },
    session: {
        list: 'See sessions',
        revoke: 'Sign sessions out',
        delete: 'Delete sessions'
    }
};
const permissions = (Object.keys(defaultStatements) as Array<keyof typeof defaultStatements>).flatMap((resource) =>
    defaultStatements[resource].map((action) => ({
        resource,
        action,
        label: PERMISSIONS[resource]?.[action] ?? `${resource}: ${action}`
    }))
);
const allows = (role: string, resource: string, action: string) =>
    accessRoles[role]?.authorize({ [resource]: [action] }).success === true;
</script>

<template>
    <UDashboardPanel id="better-auth-ui-configuration">
        <template #header>
            <UDashboardNavbar title="Configuration">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <div class="flex flex-col gap-4 sm:gap-6 w-full lg:max-w-4xl mx-auto">
                <p class="text-sm text-muted">
                    How {{ capabilities?.appName ?? 'the app' }} is set up, from its Better Auth config and the
                    <code class="text-highlighted">betterAuthUi</code> options in nuxt.config. Read-only: change them in
                    code.
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
                                <dt class="text-muted shrink-0">{{ row.label }}</dt>
                                <dd class="text-end">
                                    <span class="inline-flex flex-wrap justify-end items-center gap-1.5">
                                        <UBadge
                                            v-if="row.value"
                                            :label="row.value"
                                            :color="row.color ?? 'neutral'"
                                            variant="subtle"
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
                    <template #title><CardTitle icon="i-lucide-key-square" title="Roles and permissions" /></template>
                    <template #description>
                        What each role can do in the admin pages and Better Auth's admin endpoints. Roles with
                        <UBadge label="Staff" size="sm" variant="subtle" /> can open these pages.
                    </template>
                    <div class="overflow-x-auto -mx-1">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-left">
                                    <th class="py-2 px-1 font-medium text-muted">Permission</th>
                                    <th
                                        v-for="role in config.roles"
                                        :key="role"
                                        class="py-2 px-3 font-medium text-highlighted text-center whitespace-nowrap"
                                    >
                                        {{ upperFirst(role) }}
                                        <UBadge
                                            v-if="config.staffRoles.includes(role)"
                                            label="Staff"
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
                                            aria-label="Allowed"
                                        />
                                        <UIcon
                                            v-else
                                            name="i-lucide-minus"
                                            class="size-4 text-dimmed"
                                            aria-label="Not allowed"
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
