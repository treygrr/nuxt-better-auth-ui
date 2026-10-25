// Organization roles for Better Auth's Organization plugin, from the module's options, at build time: checked here,
// then written to a template both the server and client plugins import (https://better-auth.com/docs/plugins/organization#custom-permissions).

/** Better Auth's organization resources and actions (better-auth/plugins/organization/access's `defaultStatements`). */
export const DEFAULT_ORGANIZATION_STATEMENTS: Record<string, readonly string[]> = {
    organization: ['update', 'delete'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'],
    ac: ['create', 'read', 'update', 'delete']
};

/** Better Auth's built-in organization roles. */
export const DEFAULT_ORGANIZATION_ROLES = ['owner', 'admin', 'member'] as const;

/** A role's permissions: resource → actions, eg `{ project: ['create'], member: ['update'] }`. */
export type OrganizationPermissions = Record<string, string[]>;

const NAME = /^[a-z0-9][a-z0-9_-]*$/i;

/**
 * Checks the app's resources and roles: names Better Auth can store (no commas), and permissions on resources and
 * actions that exist. Throws a readable error at build time otherwise.
 */
export function resolveOrganizationRoles(
    statements: Record<string, string[]> = {},
    roles: Record<string, OrganizationPermissions> = {}
) {
    for (const [resource, actions] of Object.entries(statements)) {
        if (!NAME.test(resource)) {
            throw new Error(`[better-auth-ui] organization.statements: "${resource}" isn't a valid resource name.`);
        }
        for (const action of actions) {
            if (!NAME.test(action)) {
                throw new Error(
                    `[better-auth-ui] organization.statements.${resource}: "${action}" isn't a valid action.`
                );
            }
        }
    }
    // Better Auth's resources, with the app's added (and its actions added to Better Auth's own resources).
    const merged: Record<string, string[]> = Object.fromEntries(
        Object.entries(DEFAULT_ORGANIZATION_STATEMENTS).map(([resource, actions]) => [resource, [...actions]])
    );
    for (const [resource, actions] of Object.entries(statements)) {
        merged[resource] = [...new Set([...(merged[resource] ?? []), ...actions])];
    }
    for (const [role, permissions] of Object.entries(roles)) {
        if (!NAME.test(role)) {
            throw new Error(
                `[better-auth-ui] organization.roles: "${role}" isn't a valid role name: use letters, numbers, _ and -.`
            );
        }
        for (const [resource, actions] of Object.entries(permissions)) {
            if (!merged[resource]) {
                throw new Error(
                    `[better-auth-ui] organization.roles.${role}: unknown resource "${resource}". Add it to organization.statements.`
                );
            }
            for (const action of actions) {
                if (!merged[resource].includes(action)) {
                    throw new Error(
                        `[better-auth-ui] organization.roles.${role}: unknown ${resource} action "${action}". Add it to organization.statements.`
                    );
                }
            }
        }
    }
    return { statements: merged, roleNames: [...new Set([...DEFAULT_ORGANIZATION_ROLES, ...Object.keys(roles)])] };
}

/**
 * The template: Better Auth's access control over its statements and the app's, Better Auth's owner, admin and member
 * roles (with any permissions the app adds to them; Better Auth would otherwise replace them), and the app's roles.
 */
export function organizationRolesFile(
    statements: Record<string, string[]> = {},
    roles: Record<string, OrganizationPermissions> = {}
) {
    const { statements: merged } = resolveOrganizationRoles(statements, roles);
    const defaults = { owner: 'ownerAc', admin: 'adminAc', member: 'memberAc' } as const;
    // Owners have full control (as Better Auth describes them): every action on the app's resources too, so they can
    // also give them to the roles they create.
    const extra = (role: string) => {
        const permissions = { ...(roles[role] ?? {}) };
        if (role === 'owner') {
            for (const [resource, actions] of Object.entries(statements)) {
                permissions[resource] = [...new Set([...(permissions[resource] ?? []), ...actions])];
            }
        }
        return permissions;
    };
    const lines = Object.entries(defaults).map(
        ([role, base]) =>
            `    ${JSON.stringify(role)}: ac.newRole(merge(${base}.statements, ${JSON.stringify(extra(role))})),`
    );
    for (const [role, permissions] of Object.entries(roles)) {
        if (role in defaults) continue;
        lines.push(`    ${JSON.stringify(role)}: ac.newRole(${JSON.stringify(permissions)}),`);
    }
    return [
        "import { createAccessControl } from 'better-auth/plugins/access'",
        "import { adminAc, memberAc, ownerAc } from 'better-auth/plugins/organization/access'",
        `export const statements = ${JSON.stringify(merged)}`,
        'export const ac = createAccessControl(statements)',
        "/** A built-in role's permissions, with the app's added. */",
        'const merge = (base, extra) => {',
        '    const result = Object.fromEntries(Object.entries(base).map(([resource, actions]) => [resource, [...actions]]))',
        '    for (const [resource, actions] of Object.entries(extra)) result[resource] = [...new Set([...(result[resource] ?? []), ...actions])]',
        '    return result',
        '}',
        'export const roles = {',
        ...lines,
        '}'
    ].join('\n');
}
