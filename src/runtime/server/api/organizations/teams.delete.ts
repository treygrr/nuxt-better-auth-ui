import { defineEventHandler } from '#imports';
import * as z from 'zod';

import type { AuditPerson } from '../../audit/plugin';
import { recordAdminAction, requireAdminPermission } from '../../utils/admin';
import { readParams, routeId } from '../../utils/input';

const Params = z.object({ id: routeId(), teamId: routeId() });

type TeamAuth = {
    api: { removeTeam(input: { body: { teamId: string; organizationId: string } }): Promise<unknown> };
};

/**
 * Staff remove a team from an organization: Better Auth's removeTeam, called on the server without session headers,
 * as it documents; its hooks apply, and it keeps an organization's last team unless `allowRemovingAllTeams`. Staff who
 * can update users (`user: update`). Audit-logged.
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context, auth } = await requireAdminPermission(event, { user: ['update'] });
    const { id: organizationId, teamId } = readParams(event, Params);
    const [team] = await context.adapter.findMany<{ name: string }>({
        model: 'team',
        where: [{ field: 'id', value: teamId }],
        limit: 1
    });
    await (auth as unknown as TeamAuth).api.removeTeam({ body: { teamId, organizationId } });
    await recordAdminAction(event, context, {
        action: 'organization.team-remove',
        actor: admin as AuditPerson,
        target: null,
        details: { organizationId, team: team?.name ?? teamId }
    });
    return { removed: true };
});
