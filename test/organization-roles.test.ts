import { describe, expect, it } from 'vitest';

import { organizationRolesFile, resolveOrganizationRoles } from '../src/organization-roles';

describe('organization roles option', () => {
    it("adds the app's resources and roles to Better Auth's", () => {
        const { statements, roleNames } = resolveOrganizationRoles(
            { project: ['create', 'update'], member: ['invite-guests'] },
            { editor: { project: ['create'] } }
        );
        expect(statements.project).toEqual(['create', 'update']);
        expect(statements.member).toEqual(['create', 'update', 'delete', 'invite-guests']);
        expect(statements.organization).toEqual(['update', 'delete']);
        expect(roleNames).toEqual(['owner', 'admin', 'member', 'editor']);
    });

    it('rejects permissions on resources or actions that do not exist, and names Better Auth would split', () => {
        expect(() => resolveOrganizationRoles({}, { editor: { project: ['create'] } })).toThrow(
            /unknown resource "project"/
        );
        expect(() => resolveOrganizationRoles({ project: ['create'] }, { editor: { project: ['fly'] } })).toThrow(
            /unknown project action "fly"/
        );
        expect(() => resolveOrganizationRoles({}, { 'a,b': {} })).toThrow(/isn't a valid role name/);
    });

    it("keeps Better Auth's built-in roles, adding to them what the app gives", () => {
        const file = organizationRolesFile({ project: ['create'] }, { admin: { project: ['create'] }, editor: {} });
        // Owners get every action on the app's resources.
        expect(file).toContain('"owner": ac.newRole(merge(ownerAc.statements, {"project":["create"]})),');
        expect(file).toContain('"admin": ac.newRole(merge(adminAc.statements, {"project":["create"]})),');
        expect(file).toContain('"member": ac.newRole(merge(memberAc.statements, {})),');
        expect(file).toContain('"editor": ac.newRole({}),');
    });
});
