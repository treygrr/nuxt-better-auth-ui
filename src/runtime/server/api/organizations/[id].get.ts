import { createError, defineEventHandler, getRouterParam } from '#imports';

import { requireAdminPermission } from '../../utils/admin';

type Person = { id: string; name: string; email: string; image?: string | null };
export type AdminOrganizationMember = { id: string; role: string; createdAt: Date; user: Person | null };
export type AdminOrganizationInvitation = {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: Date;
    inviter: Person | null;
};
export type AdminOrganizationDetail = {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date;
    members: AdminOrganizationMember[];
    invitations: AdminOrganizationInvitation[];
};

/**
 * One organization with its members and pending invitations, for staff (`user: list`). Read with Better Auth's adapter:
 * the Organization plugin only shows an organization to its members.
 */
export default defineEventHandler(async (event): Promise<AdminOrganizationDetail> => {
    const { context } = await requireAdminPermission(event, { user: ['list'] });
    const id = getRouterParam(event, 'id');
    const [organization] = context.getPlugin('organization')
        ? await context.adapter.findMany<Omit<AdminOrganizationDetail, 'members' | 'invitations'>>({
              model: 'organization',
              where: [{ field: 'id', value: id }],
              limit: 1
          })
        : [];
    if (!organization) throw createError({ statusCode: 404, statusMessage: 'Organization not found' });

    const [members, invitations] = await Promise.all([
        context.adapter.findMany<{ id: string; userId: string; role: string; createdAt: Date }>({
            model: 'member',
            where: [{ field: 'organizationId', value: organization.id }],
            sortBy: { field: 'createdAt', direction: 'asc' },
            limit: 500
        }),
        context.adapter.findMany<{
            id: string;
            email: string;
            role: string;
            status: string;
            expiresAt: Date;
            inviterId: string;
        }>({
            model: 'invitation',
            where: [
                { field: 'organizationId', value: organization.id },
                { field: 'status', value: 'pending', connector: 'AND' }
            ],
            limit: 500
        })
    ]);
    // Each person once: members, and whoever sent the invitations.
    const ids = [...new Set([...members.map((member) => member.userId), ...invitations.map((item) => item.inviterId)])];
    const people = new Map(
        (
            await Promise.all(
                ids.map(async (userId) => [userId, await context.internalAdapter.findUserById(userId)] as const)
            )
        ).map(([userId, user]) => [
            userId,
            user ? { id: user.id, name: user.name, email: user.email, image: (user as Person).image ?? null } : null
        ])
    );
    return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo ?? null,
        createdAt: organization.createdAt,
        members: members.map((member) => ({
            id: member.id,
            role: member.role,
            createdAt: member.createdAt,
            user: people.get(member.userId) ?? null
        })),
        invitations: invitations.map((invitation) => ({
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
            inviter: people.get(invitation.inviterId) ?? null
        }))
    };
});
