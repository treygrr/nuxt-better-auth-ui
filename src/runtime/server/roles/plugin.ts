// A Better Auth plugin, loaded into the app's auth config, so no Nuxt or Nitro imports here.
//
// Roles managed in the admin pages. Better Auth's Admin plugin documents roles as code, passed once as
// `admin({ ac, roles })` (https://better-auth.com/docs/plugins/admin#access-control). This plugin keeps that
// same `roles` object in step with the `adminRole` table, so Better Auth enforces dashboard roles like any
// other. That relies on the Admin plugin reading `roles` on every permission check, which holds in Better Auth
// 1.7 but isn't documented: the module's tests check it, so an upgrade that changes it fails loudly.
import { APIError, createAuthEndpoint, createAuthMiddleware, sessionMiddleware } from 'better-auth/api';
import { defaultStatements } from 'better-auth/plugins/admin/access';
import type { BetterAuthPlugin } from 'better-auth';
import * as z from 'zod';

export const ROLE_MODEL = 'adminRole';

type Statements = Record<string, readonly string[]>;
export type RolePermissions = Record<string, string[]>;
type Role = { authorize(request: RolePermissions): { success: boolean } };
type AccessControl = { newRole(permissions: RolePermissions): Role };
type Row = { id: string; name: string; permissions: string; createdAt: Date; updatedAt: Date };
type Context = {
    adapter: {
        findMany<T>(query: {
            model: string;
            limit?: number;
            sortBy?: { field: string; direction: 'asc' | 'desc' };
        }): Promise<T[]>;
        findOne<T>(query: { model: string; where: Array<{ field: string; value: unknown }> }): Promise<T | null>;
        create(query: { model: string; data: Record<string, unknown> }): Promise<unknown>;
        update(query: {
            model: string;
            where: Array<{ field: string; value: unknown }>;
            update: Record<string, unknown>;
        }): Promise<unknown>;
        delete(query: { model: string; where: Array<{ field: string; value: unknown }> }): Promise<void>;
        count(query: {
            model: string;
            where?: Array<{ field: string; operator?: string; value: unknown; connector?: 'AND' | 'OR' }>;
        }): Promise<number | string>;
    };
    logger: { error(message: string, ...args: unknown[]): void };
};

export type AdminDynamicRolesOptions = {
    ac: AccessControl;
    /** The object passed to `admin({ ac, roles })`, kept in step with the table. */
    roles: Record<string, Role>;
    /** The role that can do everything, and may manage roles. Built in, with `user`. */
    adminRole: string;
    /** Roles from the module config, copied into the table while it has none. */
    seed: Record<string, RolePermissions>;
};

const statements = defaultStatements as unknown as Statements;
/** How often each server re-reads roles, so instances pick up changes made on another. */
const REFRESH_EVERY = 10_000;
const NAME = /^[\w-]{1,40}$/;

const permissionsSchema = z.record(z.string(), z.array(z.string()));

/** The permissions, keeping only Better Auth's resources and actions, or a 400 naming what's wrong. */
function validPermissions(permissions: RolePermissions): RolePermissions {
    const result: RolePermissions = {};
    for (const [resource, actions] of Object.entries(permissions)) {
        const allowed = statements[resource];
        if (!allowed) throw APIError.fromStatus('BAD_REQUEST', { message: `Unknown resource "${resource}"` });
        const unknown = actions.filter((action) => !allowed.includes(action));
        if (unknown.length) {
            throw APIError.fromStatus('BAD_REQUEST', {
                message: `Unknown ${resource} permission: ${unknown.join(', ')}`
            });
        }
        if (actions.length) result[resource] = [...new Set(actions)];
    }
    return result;
}

export const adminDynamicRoles = (options: AdminDynamicRolesOptions) => {
    const builtIn = new Set(['user', options.adminRole]);
    const byName = new Map<string, RolePermissions>();
    let loadedAt = 0;
    let loading: Promise<void> | null = null;

    /** Replaces the custom roles in Better Auth's `roles` object with the table's. */
    function apply(rows: Row[]) {
        for (const name of Object.keys(options.roles)) if (!builtIn.has(name)) delete options.roles[name];
        byName.clear();
        for (const row of rows) {
            const permissions = JSON.parse(row.permissions) as RolePermissions;
            byName.set(row.name, permissions);
            options.roles[row.name] = options.ac.newRole(permissions);
        }
    }

    async function load(context: Context) {
        try {
            let rows = await context.adapter.findMany<Row>({ model: ROLE_MODEL, limit: 1000 });
            if (!rows.length && Object.keys(options.seed).length) {
                const now = new Date();
                for (const [name, permissions] of Object.entries(options.seed)) {
                    await context.adapter.create({
                        model: ROLE_MODEL,
                        data: { name, permissions: JSON.stringify(permissions), createdAt: now, updatedAt: now }
                    });
                }
                rows = await context.adapter.findMany<Row>({ model: ROLE_MODEL, limit: 1000 });
            }
            apply(rows);
        } catch (error) {
            // Eg migrations haven't run: keep the roles from config, so admin and config roles still work.
            context.logger.error('[better-auth-admin] Could not load roles. Have migrations run?', error);
        }
        loadedAt = Date.now();
    }

    /** Loads roles if they're stale; concurrent requests share one load. */
    function refresh(context: Context, force = false) {
        if (!force && Date.now() - loadedAt < REFRESH_EVERY) return Promise.resolve();
        loading ??= load(context).finally(() => (loading = null));
        return loading;
    }

    /** Whether the signed-in user's role may do this, through Better Auth's own roles. */
    const allowed = (role: string | null | undefined, permissions: RolePermissions) =>
        (role || 'user').split(',').some((name) => options.roles[name.trim()]?.authorize(permissions).success === true);
    /** Everything a role allows, asked of Better Auth's role action by action. */
    const permissionsOf = (role: string | null | undefined): RolePermissions =>
        Object.fromEntries(
            Object.entries(statements)
                .map(
                    ([resource, actions]) =>
                        [resource, actions.filter((action) => allowed(role, { [resource]: [action] }))] as const
                )
                .filter(([, actions]) => actions.length)
        );
    const isAdmin = (role: string | null | undefined) =>
        (role || 'user').split(',').some((name) => name.trim() === options.adminRole);

    /** Users holding the role, alone or among several (Better Auth stores them comma-separated). */
    async function holders(context: Context, name: string) {
        const counts = await Promise.all(
            [
                [{ field: 'role', value: name }],
                [{ field: 'role', operator: 'starts_with', value: `${name},` }],
                [{ field: 'role', operator: 'ends_with', value: `,${name}` }],
                [{ field: 'role', operator: 'contains', value: `,${name},` }]
            ].map((where) => context.adapter.count({ model: 'user', where }))
        );
        return counts.reduce((sum: number, count) => sum + Number(count), 0);
    }

    const requireAdmin = (role: string | null | undefined) => {
        if (!isAdmin(role)) {
            throw APIError.fromStatus('FORBIDDEN', { message: `Only the ${options.adminRole} role can manage roles` });
        }
    };
    const body = z.object({ name: z.string(), permissions: permissionsSchema });

    return {
        id: 'better-auth-admin-roles',
        schema: {
            [ROLE_MODEL]: {
                fields: {
                    name: { type: 'string', required: true, unique: true },
                    // JSON, eg {"user":["list","ban"]}
                    permissions: { type: 'string', required: true },
                    createdAt: { type: 'date', required: true },
                    updatedAt: { type: 'date', required: true }
                }
            }
        },
        hooks: {
            // Fresh roles before any admin check, including auth.api calls on the server.
            before: [
                {
                    matcher: (ctx) => !!ctx.path?.startsWith('/admin'),
                    handler: createAuthMiddleware(async (ctx) => {
                        await refresh(ctx.context as unknown as Context);
                    })
                }
            ]
        },
        endpoints: {
            /** What the signed-in user may do, as `{ user: [...], session: [...] }`, plus whether they manage roles. */
            adminRolesPermissions: createAuthEndpoint(
                '/admin-roles/permissions',
                { method: 'GET', use: [sessionMiddleware] },
                async (ctx) => {
                    const role = (ctx.context.session.user as { role?: string | null }).role;
                    return ctx.json({ permissions: permissionsOf(role), manageRoles: isAdmin(role) });
                }
            ),
            /** Every role, with its permissions and how many users have it. For staff who can list users. */
            adminRolesList: createAuthEndpoint(
                '/admin-roles/list',
                { method: 'GET', use: [sessionMiddleware] },
                async (ctx) => {
                    const role = (ctx.context.session.user as { role?: string | null }).role;
                    if (!allowed(role, { user: ['list'] })) {
                        throw APIError.fromStatus('FORBIDDEN', { message: 'You are not allowed to list roles' });
                    }
                    const context = ctx.context as unknown as Context;
                    const roles = [
                        { name: options.adminRole, permissions: permissionsOf(options.adminRole), builtIn: true },
                        { name: 'user', permissions: permissionsOf('user'), builtIn: true },
                        ...[...byName].map(([name, permissions]) => ({ name, permissions, builtIn: false }))
                    ];
                    return ctx.json(
                        await Promise.all(
                            roles.map(async (item) => ({ ...item, users: await holders(context, item.name) }))
                        )
                    );
                }
            ),
            adminRolesCreate: createAuthEndpoint(
                '/admin-roles/create',
                { method: 'POST', body, use: [sessionMiddleware] },
                async (ctx) => {
                    requireAdmin((ctx.context.session.user as { role?: string | null }).role);
                    const context = ctx.context as unknown as Context;
                    const name = ctx.body.name.trim();
                    if (!NAME.test(name)) {
                        throw APIError.fromStatus('BAD_REQUEST', {
                            message: 'Use up to 40 letters, numbers, "-" and "_" for the name'
                        });
                    }
                    await refresh(context, true);
                    if (builtIn.has(name) || byName.has(name)) {
                        throw APIError.fromStatus('BAD_REQUEST', { message: `There's already a role called ${name}` });
                    }
                    const permissions = validPermissions(ctx.body.permissions);
                    const now = new Date();
                    await context.adapter.create({
                        model: ROLE_MODEL,
                        data: { name, permissions: JSON.stringify(permissions), createdAt: now, updatedAt: now }
                    });
                    await refresh(context, true);
                    return ctx.json({ name, permissions });
                }
            ),
            adminRolesUpdate: createAuthEndpoint(
                '/admin-roles/update',
                { method: 'POST', body, use: [sessionMiddleware] },
                async (ctx) => {
                    requireAdmin((ctx.context.session.user as { role?: string | null }).role);
                    const context = ctx.context as unknown as Context;
                    if (builtIn.has(ctx.body.name)) {
                        throw APIError.fromStatus('BAD_REQUEST', { message: `${ctx.body.name} is built in` });
                    }
                    const permissions = validPermissions(ctx.body.permissions);
                    const row = await context.adapter.findOne<Row>({
                        model: ROLE_MODEL,
                        where: [{ field: 'name', value: ctx.body.name }]
                    });
                    if (!row) throw APIError.fromStatus('NOT_FOUND', { message: 'Role not found' });
                    await context.adapter.update({
                        model: ROLE_MODEL,
                        where: [{ field: 'id', value: row.id }],
                        update: { permissions: JSON.stringify(permissions), updatedAt: new Date() }
                    });
                    await refresh(context, true);
                    return ctx.json({ name: ctx.body.name, permissions });
                }
            ),
            adminRolesDelete: createAuthEndpoint(
                '/admin-roles/delete',
                { method: 'POST', body: z.object({ name: z.string() }), use: [sessionMiddleware] },
                async (ctx) => {
                    requireAdmin((ctx.context.session.user as { role?: string | null }).role);
                    const context = ctx.context as unknown as Context;
                    if (builtIn.has(ctx.body.name)) {
                        throw APIError.fromStatus('BAD_REQUEST', { message: `${ctx.body.name} is built in` });
                    }
                    const row = await context.adapter.findOne<Row>({
                        model: ROLE_MODEL,
                        where: [{ field: 'name', value: ctx.body.name }]
                    });
                    if (!row) throw APIError.fromStatus('NOT_FOUND', { message: 'Role not found' });
                    // Deleting a role in use would silently take those users' permissions away.
                    const users = await holders(context, ctx.body.name);
                    if (users) {
                        throw APIError.fromStatus('BAD_REQUEST', {
                            message: `${users} user${users === 1 ? ' has' : 's have'} this role. Change their role first.`
                        });
                    }
                    await context.adapter.delete({ model: ROLE_MODEL, where: [{ field: 'id', value: row.id }] });
                    await refresh(context, true);
                    return ctx.json({ name: ctx.body.name });
                }
            )
        }
    } satisfies BetterAuthPlugin;
};
