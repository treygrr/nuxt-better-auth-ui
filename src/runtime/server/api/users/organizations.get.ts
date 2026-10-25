import { defineEventHandler, getRouterParam } from '#imports';

import { requireAdminPermission, requireUser } from '../../utils/admin';

/** One of a user's organizations, with their role in it. */
export type AdminUserOrganization = { id: string; name: string; slug: string; role: string; joinedAt: Date };

/** The organizations a user belongs to (Organization plugin), for staff who can view the user. */
export default defineEventHandler(async (event): Promise<AdminUserOrganization[]> => {
    const { context } = await requireAdminPermission(event, { user: ['get'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));
    if (!context.getPlugin('organization')) return [];
    const memberships = await context.adapter.findMany<{ organizationId: string; role: string; createdAt: Date }>({
        model: 'member',
        where: [{ field: 'userId', value: user.id }],
        limit: 200
    });
    const organizations = await Promise.all(
        memberships.map(async (membership) => {
            const [organization] = await context.adapter.findMany<{ id: string; name: string; slug: string }>({
                model: 'organization',
                where: [{ field: 'id', value: membership.organizationId }],
                limit: 1
            });
            return organization
                ? {
                      id: organization.id,
                      name: organization.name,
                      slug: organization.slug,
                      role: membership.role,
                      joinedAt: membership.createdAt
                  }
                : null;
        })
    );
    return organizations.filter((organization) => organization !== null);
});
