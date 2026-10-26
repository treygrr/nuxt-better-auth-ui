import { createError, defineEventHandler } from '#imports';
import * as z from 'zod';

import type { AuditPerson } from '../../audit/plugin';
import { recordAdminAction, requireAdminPermission } from '../../utils/admin';
import { readJsonBody, text } from '../../utils/input';

type OrganizationAuth = {
    api: {
        createOrganization(input: {
            body: { name: string; slug: string; userId: string; logo?: string };
        }): Promise<{ id: string; name: string; slug: string } | null>;
    };
};

const Body = z.object({
    name: z.string().trim().min(1),
    slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    ownerEmail: text().transform((email) => email.toLowerCase()),
    logo: text()
});

/**
 * Staff create an organization for a user, who becomes its owner (by email). Better Auth's createOrganization, called
 * on the server without session headers, which it documents for creating organizations on behalf of another user: its
 * hooks and limits apply as usual. Staff who can update users (`user: update`). Audit-logged.
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context, auth } = await requireAdminPermission(event, { user: ['update'] });
    const { name, slug, ownerEmail, logo } = await readJsonBody(event, Body, {
        default: {
            code: 'ORGANIZATION_DETAILS_INVALID',
            message: 'Give it a name, and a slug of lowercase letters, numbers and dashes'
        }
    });
    const owner = ownerEmail ? await context.internalAdapter.findUserByEmail(ownerEmail) : null;
    if (!owner)
        throw createError({ statusCode: 404, statusMessage: 'User not found', data: { code: 'USER_NOT_FOUND' } });

    const organization = await (auth as unknown as OrganizationAuth).api.createOrganization({
        body: { name, slug, userId: owner.user.id, ...(logo && { logo }) }
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
