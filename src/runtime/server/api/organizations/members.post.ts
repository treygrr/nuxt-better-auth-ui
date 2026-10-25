import { createError, defineEventHandler, getRouterParam, readBody } from '#imports';

import type { AuditPerson } from '../../audit/plugin';
import { recordAdminAction, requireAdminPermission } from '../../utils/admin';

type MemberAuth = {
    api: {
        addMember(input: {
            body: { userId: string; role: string | string[]; organizationId: string; teamId?: string };
        }): Promise<unknown>;
    };
};

/**
 * Staff add a user to an organization, by email, with roles (and a team): Better Auth's server-only `addMember`, which
 * it documents for adding members without an invitation. Staff who can update users (`user: update`). Audit-logged.
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context, auth } = await requireAdminPermission(event, { user: ['update'] });
    const organizationId = getRouterParam(event, 'id')!;
    const body = (await readBody<{ email?: unknown; roles?: unknown; teamId?: unknown }>(event)) ?? {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const roles = Array.isArray(body.roles)
        ? body.roles.filter((role): role is string => typeof role === 'string')
        : [];
    if (!roles.length) {
        throw createError({ statusCode: 400, statusMessage: 'Choose a role', data: { code: 'ROLE_REQUIRED' } });
    }
    const found = email ? await context.internalAdapter.findUserByEmail(email) : null;
    if (!found)
        throw createError({ statusCode: 404, statusMessage: 'User not found', data: { code: 'USER_NOT_FOUND' } });

    const member = await (auth as unknown as MemberAuth).api.addMember({
        body: {
            userId: found.user.id,
            role: roles.length === 1 ? roles[0]! : roles,
            organizationId,
            ...(typeof body.teamId === 'string' && body.teamId && { teamId: body.teamId })
        }
    });
    await recordAdminAction(event, context, {
        action: 'organization.member-add',
        actor: admin as AuditPerson,
        target: found.user as AuditPerson,
        details: { organizationId, roles }
    });
    return member;
});
