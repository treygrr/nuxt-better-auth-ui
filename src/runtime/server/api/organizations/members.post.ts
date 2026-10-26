import { createError, defineEventHandler, getRouterParam } from '#imports';
import * as z from 'zod';

import type { AuditPerson } from '../../audit/plugin';
import { recordAdminAction, requireAdminPermission } from '../../utils/admin';
import { readJsonBody, text } from '../../utils/input';

type MemberAuth = {
    api: {
        addMember(input: {
            body: { userId: string; role: string | string[]; organizationId: string; teamId?: string };
        }): Promise<unknown>;
    };
};

const Body = z.object({
    email: text().transform((email) => email.toLowerCase()),
    roles: z.array(z.string().min(1)).min(1),
    teamId: text()
});

/**
 * Staff add a user to an organization, by email, with roles (and a team): Better Auth's server-only `addMember`, which
 * it documents for adding members without an invitation. Staff who can update users (`user: update`). Audit-logged.
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context, auth } = await requireAdminPermission(event, { user: ['update'] });
    const organizationId = getRouterParam(event, 'id')!;
    const { email, roles, teamId } = await readJsonBody(event, Body, {
        roles: { code: 'ROLE_REQUIRED', message: 'Choose a role' }
    });
    const found = email ? await context.internalAdapter.findUserByEmail(email) : null;
    if (!found)
        throw createError({ statusCode: 404, statusMessage: 'User not found', data: { code: 'USER_NOT_FOUND' } });

    const member = await (auth as unknown as MemberAuth).api.addMember({
        body: {
            userId: found.user.id,
            role: roles.length === 1 ? roles[0]! : roles,
            organizationId,
            ...(teamId && { teamId })
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
