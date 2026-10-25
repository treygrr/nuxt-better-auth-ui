import { createError, defineEventHandler, readBody } from '#imports';

import type { AuditPerson } from '../../audit/plugin';
import { recordAdminAction, requireAdminPermission } from '../../utils/admin';

type OrganizationAuth = {
    api: {
        createOrganization(input: {
            body: { name: string; slug: string; userId: string; logo?: string };
        }): Promise<{ id: string; name: string; slug: string } | null>;
    };
};

/**
 * Staff create an organization for a user, who becomes its owner (by email). Better Auth's createOrganization, called
 * on the server without session headers, which it documents for creating organizations on behalf of another user: its
 * hooks and limits apply as usual. Staff who can update users (`user: update`). Audit-logged.
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context, auth } = await requireAdminPermission(event, { user: ['update'] });
    const body =
        (await readBody<{ name?: unknown; slug?: unknown; ownerEmail?: unknown; logo?: unknown }>(event)) ?? {};
    const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const name = text(body.name);
    const slug = text(body.slug).toLowerCase();
    if (!name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Give it a name, and a slug of lowercase letters, numbers and dashes',
            data: { code: 'ORGANIZATION_DETAILS_INVALID' }
        });
    }
    const owner = await context.internalAdapter.findUserByEmail(text(body.ownerEmail).toLowerCase());
    if (!owner)
        throw createError({ statusCode: 404, statusMessage: 'User not found', data: { code: 'USER_NOT_FOUND' } });

    const organization = await (auth as unknown as OrganizationAuth).api.createOrganization({
        body: { name, slug, userId: owner.user.id, ...(text(body.logo) && { logo: text(body.logo) }) }
    });
    if (!organization) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to create the organization',
            data: { code: 'FAILED_TO_CREATE_ORGANIZATION' }
        });
    }
    await recordAdminAction(event, context, {
        action: 'organization.create',
        actor: admin as AuditPerson,
        target: owner.user as AuditPerson,
        details: { organizationId: organization.id, name: organization.name }
    });
    return organization;
});
