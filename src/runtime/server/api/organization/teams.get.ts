import { createError, defineEventHandler, requireUserSession, serverAuth } from '#imports';
import * as z from 'zod';

import { findAll, findUsersById, type AdminContext } from '../../utils/admin';
import { readParams, routeId } from '../../utils/input';

const Params = z.object({ id: routeId() });

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
    const { id: organizationId } = readParams(event, Params);
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
    if (!teams.length) return [];

    // Every team's members in one query, and each person once.
    const memberships = await findAll<{ teamId: string; userId: string }>(context, {
        model: 'teamMember',
        where: [{ field: 'teamId', operator: 'in', value: teams.map((team) => team.id) }]
    });
    const people = await findUsersById(
        context,
        memberships.map((membership) => membership.userId)
    );
    return teams.map((team) => ({
        ...team,
        members: memberships.flatMap(({ teamId, userId }) => {
            const person = teamId === team.id ? people.get(userId) : undefined;
            return person ? [{ userId, name: person.name, email: person.email, image: person.image ?? null }] : [];
        })
    }));
});
