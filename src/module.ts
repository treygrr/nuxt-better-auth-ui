import { existsSync } from 'node:fs';

import type { NuxtPage } from '@nuxt/schema';

import { resolveRoles, rolesFile, rolesTypes, type AdminRolePermissions } from './roles';
import type { BetterAuthEmailName } from './runtime/server/emails/types';
import type { BetterAuthAdminPublicConfig } from './runtime/app/utils/config';
import { ADMIN_API, DEMO_API } from './runtime/constants';
import {
    addComponentsDir,
    addImports,
    addServerHandler,
    addLayout,
    addTemplate,
    createResolver,
    defineNuxtModule,
    extendPages,
    extendRouteRules,
    resolvePath,
    useLogger
} from '@nuxt/kit';

export type { AdminRolePermissions };

/** The admin dashboard's options. */
export type AdminOptions = {
    /**
     * The admin dashboard. Off, none of its pages, routes or Better Auth plugins are added.
     * @default true
     */
    enabled: boolean;
    /**
     * Where the admin pages live, eg `/admin/users`.
     * @default '/admin'
     */
    route: string;
    /**
     * The role that can do everything in the admin pages and Better Auth's admin endpoints.
     * @default 'admin'
     */
    role: string;
    /**
     * More roles, with the Better Auth Admin permissions each grants. Roles that can list users open the admin
     * pages, which show only the actions their role allows; Better Auth enforces the same permissions.
     * @example { moderator: { user: ['list', 'get', 'ban'], session: ['list', 'revoke'] } }
     * @default {}
     */
    roles: Record<string, AdminRolePermissions>;
    /**
     * Better Auth Admin plugin options, passed through as documented
     * (https://better-auth.com/docs/plugins/admin#options).
     */
    /** The role new users get. Must be `user`, the admin role, or one of `roles`. @default 'user' */
    defaultRole?: string;
    /** The ban reason when an admin gives none. Better Auth's default: "No reason". */
    defaultBanReason?: string;
    /** Seconds a ban lasts when an admin gives no length. Better Auth's default: forever. */
    defaultBanExpiresIn?: number;
    /** What banned users see when they try to sign in. */
    bannedUserMessage?: string;
    /** Seconds an impersonation session lasts. Better Auth's default: 3600 (an hour). */
    impersonationSessionDuration?: number;
    /**
     * Let admins sign in as a user from their page, through Better Auth's impersonation. Off, Better Auth's
     * impersonate-user endpoint is refused too. Apps showing the banner add `<AdminImpersonationBanner />`.
     * @default false
     */
    impersonation: boolean;
    /**
     * Record admin actions (bans, role changes, deletions, impersonation, …) in an `adminAuditLog` table,
     * created by Better Auth's migrations, and show them in the admin pages.
     * @default true
     */
    auditLog: boolean;
    /**
     * How many days the audit log keeps entries; older ones are deleted. 0 keeps them forever.
     * @default 30
     */
    auditLogRetentionDays: number;
    /**
     * Opt-in "last active" and "online now": records when each signed-in user was last active (their page loads)
     * in an `adminUserActivity` table, at most once per user per `updateInterval` (ms) on each server, so about
     * one write per signed-in user per interval. Like Better Auth's dashboard activity tracking, off by default.
     * @default { enabled: false, updateInterval: 300000 }
     */
    activityTracking: { enabled: boolean; updateInterval?: number };
    /**
     * Also record users' own sign-ins (any method), failed sign-ins, sign-outs, password resets and changes, and
     * email verification in the audit log. One write per event.
     * @default true
     */
    auditUserEvents: boolean;
};

export type ModuleOptions = {
    /** The admin dashboard for managing users (`/admin`). */
    admin: AdminOptions;
    /**
     * Auth emails, sent through `betterAuthEmails` in the app's auth config. Paths are relative to the project
     * root, eg `./server/emails/send.ts`; Nuxt aliases work too (`~~/server/…`).
     */
    emails: {
        /** A file whose default export delivers emails: `defineBetterAuthEmailSender(async ({ to, subject, text, html }) => …)`. */
        send?: string;
        /**
         * Files overriding the plain-text default for an email, each exporting
         * `defineBetterAuthEmail('verify-email', async ({ user, url }) => html)`.
         */
        templates?: Partial<Record<BetterAuthEmailName, string>>;
    };
};

/** The layout the admin pages use: a Nuxt UI dashboard, separate from the app's own layouts. */
const LAYOUT = 'better-auth-ui';

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: '@treygrr/nuxt-better-auth-ui',
        configKey: 'betterAuthUi',
        compatibility: { nuxt: '^4.6.0' }
    },
    defaults: {
        admin: {
            enabled: true,
            route: '/admin',
            role: 'admin',
            roles: {},
            impersonation: false,
            auditLog: true,
            auditLogRetentionDays: 30,
            auditUserEvents: true,
            activityTracking: { enabled: false }
        },
        emails: {}
    },
    // Installed before this module, in order, and checked against these versions.
    moduleDependencies: {
        '@nuxt/ui': { version: '>=4.12.0' },
        '@nuxtjs/better-auth': { version: '>=0.3.12' },
        // useBreakpoints and friends, used by the dashboard template's pages.
        '@vueuse/nuxt': { version: '>=14.0.0' }
    },
    async setup(moduleOptions, nuxt) {
        const { resolve } = createResolver(import.meta.url);
        const { admin: options, emails } = moduleOptions;

        // The app's email sender and templates, for `betterAuthEmails`. A virtual module, so Nitro bundles the
        // app's files; the helper only imports it when it sends, since the auth config also loads at build time.
        const EMAILS: BetterAuthEmailName[] = ['verify-email', 'reset-password', 'existing-user-sign-up'];
        const unknownEmails = Object.keys(emails.templates ?? {}).filter(
            (name) => !EMAILS.includes(name as BetterAuthEmailName)
        );
        if (unknownEmails.length) {
            throw new Error(
                `[better-auth-ui] Unknown email template ${unknownEmails.join(', ')}. Use ${EMAILS.join(', ')}.`
            );
        }
        // Relative to the project root, like Nuxt's other paths; aliases work too (`~~/server/…`).
        const emailFile = async (setting: string, file: string) => {
            const path = await resolvePath(file, { cwd: nuxt.options.rootDir });
            if (!existsSync(path)) {
                throw new Error(`[better-auth-ui] ${setting}: can't find "${file}" (looked for ${path})`);
            }
            return path;
        };
        const emailFiles = {
            send: emails.send && (await emailFile('emails.send', emails.send)),
            templates: await Promise.all(
                Object.entries(emails.templates ?? {}).map(
                    async ([name, file]) => [name, await emailFile(`emails.templates['${name}']`, file!)] as const
                )
            )
        };
        nuxt.hook('nitro:config', (nitroConfig) => {
            nitroConfig.virtual ??= {};
            nitroConfig.virtual['#better-auth-ui/email-config'] = () =>
                [
                    emailFiles.send ? `import send from ${JSON.stringify(emailFiles.send)}` : 'const send = undefined',
                    ...emailFiles.templates.map(([, file], i) => `import template${i} from ${JSON.stringify(file)}`),
                    `export const emailConfig = { send, templates: { ${emailFiles.templates
                        .map(([name], i) => `${JSON.stringify(name)}: template${i}`)
                        .join(', ')} } }`
                ].join('\n');
        });

        (nuxt.options.runtimeConfig.public as Record<string, unknown>).betterAuthUi = {};
        if (!options.enabled) return;

        // The admin dashboard.
        const route = `/${options.route.replace(/^\/+|\/+$/g, '')}`;

        const roles = resolveRoles(options.role, options.roles);
        const roleNames = ['user', options.role, ...Object.keys(options.roles)];
        if (options.defaultRole && !roleNames.includes(options.defaultRole)) {
            throw new Error(
                `[better-auth-ui] defaultRole "${options.defaultRole}" isn't a role. Use ${roleNames.join(', ')}.`
            );
        }
        // Documented Admin plugin options the app set, passed straight through.
        const adminOptions = Object.fromEntries(
            (
                [
                    'defaultRole',
                    'defaultBanReason',
                    'defaultBanExpiresIn',
                    'bannedUserMessage',
                    'impersonationSessionDuration'
                ] as const
            )
                .filter((key) => options[key] !== undefined)
                .map((key) => [key, options[key]])
        );
        if (roles.withoutAccess.length) {
            useLogger('better-auth-ui').warn(
                `Role${roles.withoutAccess.length > 1 ? 's' : ''} ${roles.withoutAccess.join(', ')} can't list users, so can't open the admin pages.`
            );
        }

        (nuxt.options.runtimeConfig.public.betterAuthUi as Record<string, unknown>).admin = {
            route,
            role: options.role,
            roles: roles.names,
            staffRoles: roles.staff,
            impersonation: options.impersonation,
            auditLog: options.auditLog,
            lastSignIn: options.auditLog && options.auditUserEvents,
            activityTracking: options.activityTracking.enabled,
            activityInterval: options.activityTracking.updateInterval ?? 300_000,
            auditLogRetentionDays: Math.max(0, Math.floor(options.auditLogRetentionDays))
        } satisfies BetterAuthAdminPublicConfig;

        // The roles, built with Better Auth's access control. The server and client plugins and the admin pages
        // (as #better-auth-ui/roles) all use this one file.
        const rolesTemplate = addTemplate({
            filename: 'better-auth-ui/roles.mjs',
            write: true,
            getContents: () => rolesFile(options.role, options.roles)
        });
        addTemplate({ filename: 'better-auth-ui/roles.d.mts', write: true, getContents: () => rolesTypes });
        nuxt.options.alias['#better-auth-ui/roles'] = rolesTemplate.dst;

        // Better Auth's Admin plugin, added to the app's auth config through @nuxtjs/better-auth.
        // It adds the role and ban columns to the user table and the /api/auth/admin/* endpoints. Passed `ac` and
        // `roles` only, as documented (https://better-auth.com/docs/plugins/admin#access-control): with custom
        // access control `adminRoles` isn't needed, and its default (`admin`) decides who needs impersonate-admins.
        const serverPlugin = addTemplate({
            filename: 'better-auth-ui/server-plugin.mjs',
            write: true,
            getContents: () =>
                [
                    "import { admin } from 'better-auth/plugins'",
                    "import { ac, roles } from './roles.mjs'",
                    `export default admin({ ac, roles, ...${JSON.stringify(adminOptions)} })`
                ].join('\n')
        });
        // Better Auth lets any admin impersonate. With the option off, this refuses the endpoint, so hiding the
        // button isn't the only thing standing in the way.
        const impersonationOff = addTemplate({
            filename: 'better-auth-ui/impersonation-off.mjs',
            write: true,
            getContents: () =>
                [
                    "import { APIError, createAuthMiddleware } from 'better-auth/api'",
                    'export default {',
                    "    id: 'better-auth-ui-impersonation-off',",
                    '    hooks: {',
                    '        before: [{',
                    "            matcher: (context) => context.path === '/admin/impersonate-user',",
                    '            handler: createAuthMiddleware(async () => {',
                    "                throw new APIError('FORBIDDEN', { message: 'Impersonation is turned off (betterAuthUi.admin.impersonation)' })",
                    '            })',
                    '        }]',
                    '    }',
                    '}'
                ].join('\n')
        });
        const auditLog = addTemplate({
            filename: 'better-auth-ui/audit-log.mjs',
            write: true,
            getContents: () =>
                [
                    `import { adminAuditLog } from ${JSON.stringify(resolve('./runtime/server/audit/plugin'))}`,
                    `export default adminAuditLog(${JSON.stringify({ retentionDays: Math.max(0, Math.floor(options.auditLogRetentionDays)), userEvents: options.auditUserEvents })})`
                ].join('\n')
        });
        const activity = addTemplate({
            filename: 'better-auth-ui/activity.mjs',
            write: true,
            getContents: () =>
                [
                    `import { adminActivityTracking } from ${JSON.stringify(resolve('./runtime/server/activity/plugin'))}`,
                    `export default adminActivityTracking(${JSON.stringify({ updateInterval: options.activityTracking.updateInterval ?? 300_000 })})`
                ].join('\n')
        });
        const clientPlugin = addTemplate({
            filename: 'better-auth-ui/client-plugin.mjs',
            write: true,
            getContents: () =>
                [
                    "import { adminClient } from 'better-auth/client/plugins'",
                    "import { ac, roles } from './roles.mjs'",
                    'export default adminClient({ ac, roles })'
                ].join('\n')
        });
        // @nuxtjs/better-auth calls this at `modules:done`, after every module's setup.
        nuxt.hook('better-auth:plugins:extend', (sources) => {
            (sources.server ??= []).push(serverPlugin.dst);
            if (!options.impersonation) sources.server.push(impersonationOff.dst);
            if (options.auditLog) sources.server.push(auditLog.dst);
            if (options.activityTracking.enabled) sources.server.push(activity.dst);
            (sources.client ??= []).push(clientPlugin.dst);
        });

        // Module files live in node_modules, where Nuxt doesn't auto-import, so they import these
        // from #imports explicitly; registering them is what makes that work.
        addImports([
            { name: 'useBetterAuthAdminConfig', from: resolve('./runtime/app/utils/config') },
            { name: 'useAdminPath', from: resolve('./runtime/app/utils/config') },
            { name: 'useAdminDashboard', from: resolve('./runtime/app/composables/useDashboard') },
            { name: 'useAdminUsers', from: resolve('./runtime/app/composables/useAdminUsers') },
            { name: 'useAdminCan', from: resolve('./runtime/app/composables/useAdminCan') }
        ]);
        // Prefixed, so they can't clash with the app's own components: <AdminUserMenu>, <AdminHomeStats>, …
        addComponentsDir({ path: resolve('./runtime/app/components'), prefix: 'Admin' });

        // A user's linked sign-in methods, which Better Auth's Admin plugin has no endpoints for.
        if (options.activityTracking.enabled) {
            addServerHandler({
                route: `${ADMIN_API}/last-active`,
                method: 'get',
                handler: resolve('./runtime/server/api/last-active.get')
            });
        }
        if (options.auditLog && options.auditUserEvents) {
            addServerHandler({
                route: `${ADMIN_API}/last-sign-in`,
                method: 'get',
                handler: resolve('./runtime/server/api/last-sign-in.get')
            });
        }
        if (options.auditLog) {
            addServerHandler({
                route: `${ADMIN_API}/audit`,
                method: 'get',
                handler: resolve('./runtime/server/api/audit.get')
            });
        }
        addServerHandler({
            route: `${ADMIN_API}/sessions`,
            method: 'get',
            handler: resolve('./runtime/server/api/sessions.get')
        });
        addServerHandler({
            route: `${ADMIN_API}/stats`,
            method: 'get',
            handler: resolve('./runtime/server/api/stats.get')
        });
        addServerHandler({
            route: `${ADMIN_API}/accounts`,
            method: 'get',
            handler: resolve('./runtime/server/api/accounts.get')
        });
        addServerHandler({
            route: `${ADMIN_API}/users/:id/send-verification`,
            method: 'post',
            handler: resolve('./runtime/server/api/users/send-verification.post')
        });
        addServerHandler({
            route: `${ADMIN_API}/users/:id/accounts`,
            method: 'get',
            handler: resolve('./runtime/server/api/users/accounts.get')
        });
        addServerHandler({
            route: `${ADMIN_API}/users/:id/accounts/:accountId`,
            method: 'delete',
            handler: resolve('./runtime/server/api/users/accounts.delete')
        });

        // Sample data from the Nuxt UI dashboard template, for the inbox, customers and settings pages.
        for (const name of ['customers', 'mails', 'members', 'notifications']) {
            addServerHandler({
                route: `${DEMO_API}/${name}`,
                method: 'get',
                handler: resolve(`./runtime/server/api/demo/${name}`)
            });
        }
        addLayout({ src: resolve('./runtime/app/layouts/admin.vue') }, LAYOUT);

        const page = (name: string, path: string, file: string, children?: NuxtPage[]): NuxtPage => ({
            name: `better-auth-ui${name && `-${name}`}`,
            path: path ? `${route}${path}` : route,
            file: resolve(`./runtime/app/pages/${file}`),
            children
        });
        extendPages((pages) => {
            pages.push(
                page('', '', 'index.vue'),
                // Better Auth user management
                page('users', '/users', 'users/index.vue'),
                page('user', '/users/:id', 'users/[id].vue'),
                page('sessions', '/sessions', 'sessions.vue'),
                ...(options.auditLog ? [page('audit', '/audit', 'audit.vue')] : []),
                // From the dashboard template, with its sample data
                page('inbox', '/inbox', 'inbox.vue'),
                page('customers', '/customers', 'customers.vue'),
                {
                    ...page('', '/settings', 'settings.vue', [
                        { ...page('settings', '', 'settings/index.vue'), path: '' },
                        { ...page('settings-members', '', 'settings/members.vue'), path: 'members' },
                        { ...page('settings-notifications', '', 'settings/notifications.vue'), path: 'notifications' },
                        { ...page('settings-security', '', 'settings/security.vue'), path: 'security' }
                    ]),
                    name: undefined
                }
            );
        });

        // Signed-in staff only (the admin role, and custom roles that can list users); everyone else is sent to the
        // login page. Better Auth checks permissions again on every /api/auth/admin/* request.
        for (const path of [route, `${route}/**`]) {
            extendRouteRules(path, {
                appLayout: LAYOUT,
                auth: { only: 'user', user: { role: roles.staff } }
            });
        }
    }
});
