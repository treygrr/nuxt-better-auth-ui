import { createError, defineEventHandler, getRouterParam, requireUserSession, serverAuth } from '#imports';

import type { AdminContext } from '../../utils/admin';

/** A team, with its members, as the organization's page shows it. */
export type OrganizationTeam = {
    id: string;
    name: string;
    createdAt: Date;
    members: Array<{ userId: string; name: string; email: string; image: string | null }>;
} & Record<string, unknown>;

/**
 * An organization's teams with their members, for anyone in the organization. Better Auth lists a team's members only
 * to that team's own members, and the organization's page shows every team, so this reads its `team` and `teamMember`
 * tables with Better Auth's adapter after checking the user belongs to the organization. Changes go through Better
 * Auth's team endpoints.
 */
export default defineEventHandler(async (event): Promise<OrganizationTeam[]> => {
    const { user } = await requireUserSession(event);
    const organizationId = getRouterParam(event, 'id');
    const context = await (serverAuth(event) as unknown as { $context: Promise<AdminContext> }).$context;
    const plugin = context.getPlugin('organization') as { options?: { teams?: { enabled?: boolean } } } | undefined;
    if (!plugin?.options?.teams?.enabled) return [];

    const [membership] = await context.adapter.findMany<{ id: string }>({
        model: 'member',
        where: [
            { field: 'organizationId', value: organizationId },
            { field: 'userId', value: user.id, connector: 'AND' }
        ],
        limit: 1
    });
    if (!membership)
        throw createError({ statusCode: 403, statusMessage: 'Not a member', data: { code: 'NOT_ALLOWED' } });

    const teams = await context.adapter.findMany<
        { id: string; name: string; createdAt: Date } & Record<string, unknown>
    >({
        model: 'team',
        where: [{ field: 'organizationId', value: organizationId }],
        sortBy: { field: 'createdAt', direction: 'asc' },
        limit: 500
    });
    const people = new Map<string, OrganizationTeam['members'][number] | null>();
    return Promise.all(
        teams.map(async (team) => {
            const rows = await context.adapter.findMany<{ userId: string }>({
                model: 'teamMember',
                where: [{ field: 'teamId', value: team.id }],
                limit: 500
            });
            const members = await Promise.all(
                rows.map(async ({ userId }) => {
                    if (!people.has(userId)) {
                        const found = await context.internalAdapter.findUserById(userId);
                        people.set(
                            userId,
                            found
                                ? {
                                      userId,
                                      name: found.name,
                                      email: found.email,
                                      image: (found as { image?: string | null }).image ?? null
                                  }
                                : null
                        );
                    }
                    return people.get(userId);
                })
            );
            return { ...team, members: members.filter((member) => !!member) } as OrganizationTeam;
        })
    );
});
