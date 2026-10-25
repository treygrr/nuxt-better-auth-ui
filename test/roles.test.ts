import { describe, expect, it } from 'vitest';

import { resolveRoles, rolesFile } from '../src/roles';

describe('roles option', () => {
    it('gives the admin pages to the admin role and custom roles that can list users', () => {
        expect(
            resolveRoles('admin', {
                moderator: { user: ['list', 'ban'] },
                support: { user: ['list', 'get'], session: ['list'] },
                auditor: { session: ['list'] }
            })
        ).toEqual({
            names: ['user', 'admin', 'moderator', 'support', 'auditor'],
            staff: ['admin', 'moderator', 'support'],
            withoutAccess: ['auditor']
        });
    });

    it('rejects permissions Better Auth does not have', () => {
        expect(() => resolveRoles('admin', { moderator: { user: ['list', 'fly'] as never } })).toThrow(
            /Role "moderator": unknown user permission "fly"/
        );
        expect(() => resolveRoles('admin', { moderator: { posts: ['list'] } as never })).toThrow(
            /unknown resource "posts"/
        );
    });

    it('rejects redefining the built-in roles and names Better Auth would split', () => {
        expect(() => resolveRoles('admin', { admin: { user: ['list'] } })).toThrow(/"admin" is built in/);
        expect(() => resolveRoles('owner', { user: { user: ['list'] } })).toThrow(/"user" is built in/);
        expect(() => resolveRoles('admin', { 'a,b': { user: ['list'] } })).toThrow(/use letters, numbers/);
    });

    it("writes the roles with Better Auth's access control", () => {
        const file = rolesFile('owner', { moderator: { user: ['list', 'ban'] } });
        expect(file).toContain('"owner": adminAc,');
        expect(file).toContain('"moderator": ac.newRole({"user":["list","ban"]}),');
    });
});
