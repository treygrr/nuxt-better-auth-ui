import type { NuxtPage } from '@nuxt/schema';

import { resolveRoles, rolesFile, rolesTypes, type AdminRolePermissions } from './roles';
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
    useLogger
} from '@nuxt/kit';

export type { AdminRolePermissions };

export type ModuleOptions = {
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
};

/** The layout the admin pages use: a Nuxt UI dashboard, separate from the app's own layouts. */
const LAYOUT = 'better-auth-admin';

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: '@treygrr/nuxt-better-auth-admin',
        configKey: 'betterAuthAdmin',
        compatibility: { nuxt: '^4.6.0' }
    },
    defaults: {
        route: '/admin',
        role: 'admin',
        roles: {},
        impersonation: false,
        auditLog: true,
        auditLogRetentionDays: 30
    },
    // Installed before this module, in order, and checked against these versions.
    moduleDependencies: {
        '@nuxt/ui': { version: '>=4.12.0' },
        '@nuxtjs/better-auth': { version: '>=0.3.12' },
        // useBreakpoints and friends, used by the dashboard template's pages.
        '@vueuse/nuxt': { version: '>=14.0.0' }
    },
    setup(options, nuxt) {
        const { resolve } = createResolver(import.meta.url);
        const route = `/${options.route.replace(/^\/+|\/+$/g, '')}`;

        const roles = resolveRoles(options.role, options.roles);
        if (roles.withoutAccess.length) {
            useLogger('better-auth-admin').warn(
                `Role${roles.withoutAccess.length > 1 ? 's' : ''} ${roles.withoutAccess.join(', ')} can't list users, so can't open the admin pages.`
            );
        }

        nuxt.options.runtimeConfig.public.betterAuthAdmin = {
            route,
            role: options.role,
            roles: roles.names,
            staffRoles: roles.staff,
            impersonation: options.impersonation,
            auditLog: options.auditLog,
            auditLogRetentionDays: Math.max(0, Math.floor(options.auditLogRetentionDays))
        } satisfies BetterAuthAdminPublicConfig;

        // The roles, built with Better Auth's access control. The server and client plugins and the admin pages
        // (as #better-auth-admin/roles) all use this one file.
        const rolesTemplate = addTemplate({
            filename: 'better-auth-admin/roles.mjs',
            write: true,
            getContents: () => rolesFile(options.role, options.roles)
        });
        addTemplate({ filename: 'better-auth-admin/roles.d.mts', write: true, getContents: () => rolesTypes });
        nuxt.options.alias['#better-auth-admin/roles'] = rolesTemplate.dst;

        // Better Auth's Admin plugin, added to the app's auth config through @nuxtjs/better-auth.
        // It adds the role and ban columns to the user table and the /api/auth/admin/* endpoints. Staff roles
        // count as admins, so impersonating them takes the impersonate-admins permission.
        const serverPlugin = addTemplate({
            filename: 'better-auth-admin/server-plugin.mjs',
            write: true,
            getContents: () =>
                [
                    "import { admin } from 'better-auth/plugins'",
                    "import { ac, roles } from './roles.mjs'",
                    `export default admin({ ac, roles, adminRoles: ${JSON.stringify(roles.staff)} })`
                ].join('\n')
        });
        // Better Auth lets any admin impersonate. With the option off, this refuses the endpoint, so hiding the
        // button isn't the only thing standing in the way.
        const impersonationOff = addTemplate({
            filename: 'better-auth-admin/impersonation-off.mjs',
            write: true,
            getContents: () =>
                [
                    "import { APIError, createAuthMiddleware } from 'better-auth/api'",
                    'export default {',
                    "    id: 'better-auth-admin-impersonation-off',",
                    '    hooks: {',
                    '        before: [{',
                    "            matcher: (context) => context.path === '/admin/impersonate-user',",
                    '            handler: createAuthMiddleware(async () => {',
                    "                throw new APIError('FORBIDDEN', { message: 'Impersonation is turned off (betterAuthAdmin.impersonation)' })",
                    '            })',
                    '        }]',
                    '    }',
                    '}'
                ].join('\n')
        });
        const auditLog = addTemplate({
            filename: 'better-auth-admin/audit-log.mjs',
            write: true,
            getContents: () =>
                [
                    `import { adminAuditLog } from ${JSON.stringify(resolve('./runtime/server/audit/plugin'))}`,
                    `export default adminAuditLog(${JSON.stringify({ retentionDays: Math.max(0, Math.floor(options.auditLogRetentionDays)) })})`
                ].join('\n')
        });
        const clientPlugin = addTemplate({
            filename: 'better-auth-admin/client-plugin.mjs',
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
        if (options.auditLog) {
            addServerHandler({
                route: `${ADMIN_API}/audit`,
                method: 'get',
                handler: resolve('./runtime/server/api/audit.get')
            });
        }
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
            name: `better-auth-admin${name && `-${name}`}`,
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
