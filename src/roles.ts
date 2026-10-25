// Build-time role handling: validates the module's `roles` option and writes the roles file the server plugin,
// the client plugin and the admin pages all import, so a permission check means the same thing everywhere.
import { defaultStatements } from 'better-auth/plugins/admin/access';

type Statements = typeof defaultStatements;

/** What a role may do, from Better Auth's Admin permissions, eg `{ user: ['list', 'get', 'ban'] }`. */
export type AdminRolePermissions = { [Resource in keyof Statements]?: Array<Statements[Resource][number]> };

export type ResolvedRoles = {
    /** Every role, for the role pickers: `user`, the admin role, then the custom ones. */
    names: string[];
    /** Roles that can open the admin pages: the admin role, and custom roles that can list users. */
    staff: string[];
    /** Custom roles that can't list users, so can't open the admin pages. */
    withoutAccess: string[];
};

const error = (message: string) => new Error(`[better-auth-admin] ${message}`);

/** Checks the `roles` option against Better Auth's Admin permissions; throws on anything it wouldn't accept. */
export function resolveRoles(adminRole: string, custom: Record<string, AdminRolePermissions>): ResolvedRoles {
    for (const [name, permissions] of Object.entries(custom)) {
        if (name === adminRole || name === 'user') {
            throw error(`"${name}" is built in: \`${adminRole}\` can do everything and \`user\` nothing.`);
        }
        if (!/^[\w-]+$/.test(name)) {
            throw error(`Role "${name}": use letters, numbers, "-" and "_" (Better Auth separates roles with commas).`);
        }
        for (const [resource, actions] of Object.entries(permissions ?? {})) {
            const allowed = (defaultStatements as Record<string, readonly string[]>)[resource];
            if (!allowed) {
                throw error(
                    `Role "${name}": unknown resource "${resource}". Use ${Object.keys(defaultStatements).join(' or ')}.`
                );
            }
            const unknown = (actions ?? []).filter((action) => !allowed.includes(action));
            if (unknown.length) {
                throw error(
                    `Role "${name}": unknown ${resource} permission ${unknown.map((a) => `"${a}"`).join(', ')}. Use ${allowed.join(', ')}.`
                );
            }
        }
    }
    const names = Object.keys(custom);
    const canList = (name: string) => !!custom[name]?.user?.includes('list');
    return {
        names: ['user', adminRole, ...names],
        staff: [adminRole, ...names.filter(canList)],
        withoutAccess: names.filter((name) => !canList(name))
    };
}

/** The roles file: Better Auth's own access control, with the admin role, `user` and the custom roles. */
export function rolesFile(adminRole: string, custom: Record<string, AdminRolePermissions>) {
    return [
        "import { createAccessControl } from 'better-auth/plugins/access'",
        "import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access'",
        '',
        'export const ac = createAccessControl(defaultStatements)',
        'export const roles = {',
        '    user: userAc,',
        `    ${JSON.stringify(adminRole)}: adminAc,`,
        ...Object.entries(custom).map(
            ([name, permissions]) => `    ${JSON.stringify(name)}: ac.newRole(${JSON.stringify(permissions ?? {})}),`
        ),
        '}'
    ].join('\n');
}

export const rolesTypes = [
    'type Role = { authorize(request: Record<string, string[]>): { success: boolean } }',
    'export declare const ac: unknown',
    'export declare const roles: Record<string, Role>'
].join('\n');
