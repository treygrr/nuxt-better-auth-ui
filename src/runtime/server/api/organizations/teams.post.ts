import { createError, defineEventHandler, getRouterParam, readBody } from '#imports';

import type { AuditPerson } from '../../audit/plugin';
import { recordAdminAction, requireAdminPermission } from '../../utils/admin';

type TeamAuth = {
    api: {
        createTeam(input: { body: { name: string; organizationId: string } }): Promise<{ id: string; name: string }>;
    };
};

/**
 * Staff create a team in an organization: Better Auth's createTeam, called on the server without session headers, as
 * it documents; its hooks and `maximumTeams` apply as usual. Staff who can update users (`user: update`).
 * Audit-logged.
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context, auth } = await requireAdminPermission(event, { user: ['update'] });
    const organizationId = getRouterParam(event, 'id')!;
    const body = (await readBody<{ name?: unknown }>(event)) ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
        throw createError({ statusCode: 400, statusMessage: 'Name the team', data: { code: 'TEAM_NAME_REQUIRED' } });
    }
    const team = await (auth as unknown as TeamAuth).api.createTeam({ body: { name, organizationId } });
    await recordAdminAction(event, context, {
        action: 'organization.team-create',
        actor: admin as AuditPerson,
        target: null,
        details: { organizationId, team: team.name }
    });
    return team;
});
