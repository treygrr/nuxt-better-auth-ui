import type { NuxtPage } from '@nuxt/schema';

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
    extendRouteRules
} from '@nuxt/kit';

export type ModuleOptions = {
    /**
     * Where the admin pages live, eg `/admin/users`.
     * @default '/admin'
     */
    route: string;
    /**
     * The role that may use the admin pages and Better Auth's admin endpoints.
     * @default 'admin'
     */
    role: string;
    /**
     * Show "impersonate user" in the admin pages.
     * @default false
     */
    impersonation: boolean;
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
        impersonation: false
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

        nuxt.options.runtimeConfig.public.betterAuthAdmin = {
            route,
            role: options.role,
            impersonation: options.impersonation
        } satisfies BetterAuthAdminPublicConfig;

        // Better Auth's Admin plugin, added to the app's auth config through @nuxtjs/better-auth.
        // It adds the role and ban columns to the user table and the /api/auth/admin/* endpoints.
        const serverPlugin = addTemplate({
            filename: 'better-auth-admin/server-plugin.mjs',
            write: true,
            getContents: () =>
                [
                    "import { admin } from 'better-auth/plugins'",
                    `export default admin(${JSON.stringify({ adminRoles: [options.role] })})`
                ].join('\n')
        });
        const clientPlugin = addTemplate({
            filename: 'better-auth-admin/client-plugin.mjs',
            write: true,
            getContents: () =>
                ["import { adminClient } from 'better-auth/client/plugins'", 'export default adminClient()'].join('\n')
        });
        // @nuxtjs/better-auth calls this at `modules:done`, after every module's setup.
        nuxt.hook('better-auth:plugins:extend', (sources) => {
            (sources.server ??= []).push(serverPlugin.dst);
            (sources.client ??= []).push(clientPlugin.dst);
        });

        // Module files live in node_modules, where Nuxt doesn't auto-import, so they import these
        // from #imports explicitly; registering them is what makes that work.
        addImports([
            { name: 'useBetterAuthAdminConfig', from: resolve('./runtime/app/utils/config') },
            { name: 'useAdminPath', from: resolve('./runtime/app/utils/config') },
            { name: 'useAdminDashboard', from: resolve('./runtime/app/composables/useDashboard') },
            { name: 'useAdminUsers', from: resolve('./runtime/app/composables/useAdminUsers') }
        ]);
        // Prefixed, so they can't clash with the app's own components: <AdminUserMenu>, <AdminHomeStats>, …
        addComponentsDir({ path: resolve('./runtime/app/components'), prefix: 'Admin' });

        // A user's linked sign-in methods, which Better Auth's Admin plugin has no endpoints for.
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

        // Signed-in users with the admin role only; everyone else is sent to the login page.
        // Better Auth checks the role again on every /api/auth/admin/* request.
        for (const path of [route, `${route}/**`]) {
            extendRouteRules(path, {
                appLayout: LAYOUT,
                auth: { only: 'user', user: { role: options.role } }
            });
        }
    }
});
