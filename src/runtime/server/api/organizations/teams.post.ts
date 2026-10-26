import { defineEventHandler } from '#imports';
import * as z from 'zod';

import type { AuditPerson } from '../../audit/plugin';
import { recordAdminAction, requireAdminPermission } from '../../utils/admin';
import { readJsonBody, readParams, routeId } from '../../utils/input';

type TeamAuth = {
    api: {
        createTeam(input: { body: { name: string; organizationId: string } }): Promise<{ id: string; name: string }>;
    };
};

const Params = z.object({ id: routeId() });
const Body = z.object({ name: z.string().trim().min(1) });

/**
 * Staff create a team in an organization: Better Auth's createTeam, called on the server without session headers, as
 * it documents; its hooks and `maximumTeams` apply as usual. Staff who can update users (`user: update`).
 * Audit-logged.
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context, auth } = await requireAdminPermission(event, { user: ['update'] });
    const { id: organizationId } = readParams(event, Params);
    const { name } = await readJsonBody(event, Body, {
        name: { code: 'TEAM_NAME_REQUIRED', message: 'Name the team' }
    });
    const team = await (auth as unknown as TeamAuth).api.createTeam({ body: { name, organizationId } });
    await recordAdminAction(event, context, {
        action: 'organization.team-create',
        actor: admin as AuditPerson,
        target: null,
        details: { organizationId, team: team.name }
    });
    return team;
});
