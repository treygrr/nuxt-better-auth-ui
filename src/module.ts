import type { BetterAuthAdminPublicConfig } from './runtime/app/utils/config';
import {
    addImports,
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
        '@nuxtjs/better-auth': { version: '>=0.3.12' }
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

        addImports({ name: 'useBetterAuthAdminConfig', from: resolve('./runtime/app/utils/config') });
        addLayout({ src: resolve('./runtime/app/layouts/admin.vue') }, LAYOUT);

        extendPages((pages) => {
            pages.push(
                {
                    name: 'better-auth-admin',
                    path: route,
                    file: resolve('./runtime/app/pages/index.vue')
                },
                {
                    name: 'better-auth-admin-users',
                    path: `${route}/users`,
                    file: resolve('./runtime/app/pages/users/index.vue')
                },
                {
                    name: 'better-auth-admin-user',
                    path: `${route}/users/:id`,
                    file: resolve('./runtime/app/pages/users/[id].vue')
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
